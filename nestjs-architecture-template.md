# NestJS Architecture Template

Template genérico de projeto NestJS com arquitetura hexagonal, padrões de resposta, tratamento de erros, event-driven e `@Transactional` para DrizzleORM (banco único).

---

## Estrutura de Diretórios

```
src/
├── main.ts
├── app.module.ts
│
├── shared/                          # Módulo global — cross-cutting concerns
│   ├── shared.module.ts
│   │
│   ├── domain/
│   │   ├── constants/
│   │   │   └── error-codes.ts
│   │   ├── events/                  # Contratos de eventos de domínio
│   │   │   └── example.events.ts
│   │   ├── types/
│   │   │   └── result.type.ts
│   │   └── utils/
│   │       └── result.utils.ts
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── database.module.ts
│   │   │   ├── database.connection.ts
│   │   │   ├── transaction-context.ts
│   │   │   ├── transactional.decorator.ts
│   │   │   └── schema/
│   │   │       └── examples.schema.ts   # um arquivo por tabela
│   │   ├── logger/
│   │   │   ├── logger.module.ts
│   │   │   └── logger.service.ts
│   │   └── listeners/               # Ouvintes de eventos (async)
│   │       └── example.listener.ts
│   │
│   └── presentation/
│       ├── decorators/
│       │   ├── current-user.decorator.ts
│       │   ├── public.decorator.ts
│       │   └── traced.decorator.ts
│       ├── filters/
│       │   └── http-exception.filter.ts
│       ├── guards/
│       │   └── jwt.guard.ts
│       └── interceptors/
│           └── result.interceptor.ts
│
└── modules/
    └── example/                     # Cada módulo segue o mesmo padrão
        ├── example.module.ts
        ├── domain/
        │   ├── entities/
        │   │   └── example.entity.ts
        │   ├── repositories/
        │   │   └── example.repository.interface.ts
        │   └── services/
        │       └── example.service.interface.ts
        ├── application/
        │   └── use-cases/
        │       └── create-example.use-case.ts
        ├── infrastructure/
        │   └── repositories/
        │       └── example.repository.ts
        └── presentation/
            ├── controllers/
            │   └── example.controller.ts
            └── dtos/
                └── create-example.dto.ts
```

---

## 1. Result

`Result<T>` é um tipo discriminado — o contrato central entre camadas. Use cases **sempre** retornam `Result<T>`. Nunca lance exceções para erros de domínio esperados.

```typescript
// src/shared/domain/types/result.type.ts

export interface ResultSuccess<T = void> {
  success: true;
  data: T;
  code?: string;
}

export interface ResultSuccessVoid {
  success: true;
  data?: never;
  code?: string;
}

export interface ResultError {
  success: false;
  error: {
    statusCode: number;
    message: string;
    clientMessage?: string;
    code?: string;
  };
}

export type Result<T = void> =
  | (T extends void ? ResultSuccessVoid : ResultSuccess<T>)
  | ResultError;
```

```typescript
// src/shared/domain/utils/result.utils.ts

import { HttpStatus } from "@nestjs/common";
import { ResultError, ResultSuccess, ResultSuccessVoid } from "../types/result.type";

export function ok(): ResultSuccessVoid;
export function ok<T>(data: T, code?: string): ResultSuccess<T>;
export function ok<T>(data?: T, code?: string): ResultSuccessVoid | ResultSuccess<T> {
  if (data === undefined) return { success: true } as ResultSuccessVoid;
  return { success: true, data, ...(code && { code }) };
}

export function fail(
  statusCode: number,
  message: string,
  clientMessage?: string,
  code?: string,
): ResultError {
  return {
    success: false,
    error: { statusCode, message, clientMessage: clientMessage ?? message, ...(code && { code }) },
  };
}

export const Fail = {
  unauthorized: (message: string, clientMessage?: string, code?: string) =>
    fail(HttpStatus.UNAUTHORIZED, message, clientMessage, code),

  forbidden: (message: string, clientMessage?: string, code?: string) =>
    fail(HttpStatus.FORBIDDEN, message, clientMessage, code),

  notFound: (message: string, clientMessage?: string, code?: string) =>
    fail(HttpStatus.NOT_FOUND, message, clientMessage, code),

  badRequest: (message: string, clientMessage?: string, code?: string) =>
    fail(HttpStatus.BAD_REQUEST, message, clientMessage, code),

  conflict: (message: string, clientMessage?: string, code?: string) =>
    fail(HttpStatus.CONFLICT, message, clientMessage, code),

  gone: (message: string, clientMessage?: string, code?: string) =>
    fail(HttpStatus.GONE, message, clientMessage, code),

  tooManyRequests: (message: string, clientMessage?: string, code?: string) =>
    fail(HttpStatus.TOO_MANY_REQUESTS, message, clientMessage, code),

  unprocessableEntity: (message: string, clientMessage?: string, code?: string) =>
    fail(HttpStatus.UNPROCESSABLE_ENTITY, message, clientMessage, code),

  internal: (message: string, clientMessage?: string, code?: string) =>
    fail(HttpStatus.INTERNAL_SERVER_ERROR, message, clientMessage, code),
} as const;
```

**Como usar:**

```typescript
// No use case
return ok({ id: 1, name: 'Arthur' });
return Fail.notFound('Usuário não encontrado', 'Usuário não encontrado', 'USER_NOT_FOUND');
return Fail.conflict(`${input.name} já existe`, `${input.name} já existe`, 'EXAMPLE_ALREADY_EXISTS');

// No controller — retorna Result<T> direto, o interceptor resolve
async findOne(@Param('id') id: string) {
  return this.findUserUseCase.execute(id);
}
```

> `message` é para logs internos; `clientMessage` é o que vai para o cliente. Se omitido, `clientMessage` assume o mesmo valor de `message`.

---

## 2. HttpExceptionFilter

Captura todas as exceções não tratadas e formata a resposta HTTP de forma consistente. O `ResultInterceptor` já trata erros de domínio antes de chegar aqui — o filter lida com exceções inesperadas e erros de validação.

```typescript
// src/shared/presentation/filters/http-exception.filter.ts

import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { LoggerService } from "../logger/logger.service";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: LoggerService,
    private readonly isProduction: boolean,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const timestamp = new Date().toISOString();
    const path = request.url;

    if (exception instanceof HttpException) {
      this.handleHttpException(exception, response, timestamp, path);
      return;
    }

    this.handleUnknownException(exception, response, timestamp, path);
  }

  private handleHttpException(
    exception: HttpException,
    response: FastifyReply,
    timestamp: string,
    path: string,
  ): void {
    const status = exception.getStatus();
    const body = exception.getResponse() as Record<string, unknown>;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error("HTTP 5xx", { status, path, body });
    }

    // Erros de validação (class-validator)
    if (status === HttpStatus.BAD_REQUEST && Array.isArray(body.message)) {
      response.status(status).send({
        statusCode: status,
        error: "validation_error",
        message: body.message,
        timestamp,
        path,
      });
      return;
    }

    response.status(status).send({
      statusCode: status,
      error: body.error ?? null,
      message: body.message ?? exception.message,
      timestamp,
      path,
    });
  }

  private handleUnknownException(
    exception: unknown,
    response: FastifyReply,
    timestamp: string,
    path: string,
  ): void {
    const message = exception instanceof Error ? exception.message : "Unknown error";
    this.logger.error("Unhandled exception", {
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
      path,
    });

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: this.isProduction ? "Internal server error" : message,
      timestamp,
      path,
    });
  }
}
```

**Formato de resposta de erro:**

```json
// Erro de domínio — vindo do ResultInterceptor (400/403/404/409/500)
{
  "message": "Usuário não encontrado"
}

// Erro de domínio com DEBUG_MODE=true
{
  "message": "User id=99 not found in database",
  "code": "USER_NOT_FOUND"
}

// Erro de validação (400) — vindo do ValidationPipe via HttpExceptionFilter
{
  "statusCode": 400,
  "error": "validation_error",
  "message": ["name must be a string", "email must be an email"],
  "timestamp": "...",
  "path": "..."
}
```

---

## 3. ResultInterceptor

Detecta se o retorno do controller é um `Result<T>` (tem `success` boolean). Se `success: true`, retorna `data` diretamente. Se `success: false`, lança `HttpException` com o status e mensagem do erro.

```typescript
// src/shared/presentation/interceptors/result.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Result } from "../../domain/types/result.type";

@Injectable()
export class ResultInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next
      .handle()
      .pipe(map((data) => (this.isResult(data) ? this.handleResult(data) : data)));
  }

  private isResult(data: unknown): data is Result<unknown> {
    return (
      typeof data === "object" &&
      data !== null &&
      "success" in data &&
      typeof (data as Record<string, unknown>).success === "boolean"
    );
  }

  private handleResult<T>(result: Result<T>): T | undefined {
    if (!result.success) {
      const isDebug = this.configService.get("DEBUG_MODE") === "true";
      const message = isDebug
        ? result.error.message
        : (result.error.clientMessage ?? result.error.message);

      const body: Record<string, unknown> = { message };
      if (isDebug && result.error.code) body.code = result.error.code;

      throw new HttpException(body, result.error.statusCode);
    }

    return result.data;
  }
}
```

**Fluxo completo:**

```
Controller retorna Result<T>
  → ResultInterceptor detecta { success: boolean }
    → success: true  → retorna result.data diretamente
    → success: false → lança HttpException com result.error.statusCode
      → HttpExceptionFilter formata timestamp e path na resposta final
```

**Registro global no AppModule:**

```typescript
// src/app.module.ts
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";

@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResultInterceptor },
    {
      provide: APP_FILTER,
      useFactory: (logger: LoggerService) =>
        new HttpExceptionFilter(logger, process.env.NODE_ENV === "production"),
      inject: [LoggerService],
    },
  ],
})
export class AppModule {}
```

---

## 4. Padrão de Módulo (Arquitetura Hexagonal)

Cada módulo segue quatro camadas. A dependência flui para dentro: `presentation → application → domain ← infrastructure`.

### 4.1 Domain — Entidade

```typescript
// src/modules/example/domain/entities/example.entity.ts

export interface ExampleProps {
  id: string;
  name: string;
  status: "active" | "inactive";
  createdAt: Date;
}

export class Example {
  constructor(private readonly props: ExampleProps) {}

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get status(): "active" | "inactive" {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  isActive(): boolean {
    return this.props.status === "active";
  }

  deactivate(): Example {
    return new Example({ ...this.props, status: "inactive" });
  }
}
```

### 4.2 Domain — Interface do Repositório

```typescript
// src/modules/example/domain/repositories/example.repository.interface.ts

export const EXAMPLE_REPOSITORY = Symbol("IExampleRepository");

export interface IExampleRepository {
  findById(id: string): Promise<Example | null>;
  findAll(filters: ExampleFilters): Promise<Example[]>;
  save(example: Example): Promise<Example>;
  delete(id: string): Promise<void>;
}

export interface ExampleFilters {
  status?: "active" | "inactive";
  page?: number;
  perPage?: number;
}
```

### 4.3 Application — Use Case

```typescript
// src/modules/example/application/use-cases/create-example.use-case.ts

import { Injectable, Inject } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Result } from "@shared/domain/types/result.type";
import { ok, Fail } from "@shared/domain/utils/result.utils";
import {
  EXAMPLE_REPOSITORY,
  IExampleRepository,
} from "../../domain/repositories/example.repository.interface";
import { ExampleCreatedEvent } from "@shared/domain/events/example.events";

export interface CreateExampleInput {
  name: string;
}

export interface CreateExampleOutput {
  id: string;
  name: string;
}

@Injectable()
export class CreateExampleUseCase {
  constructor(
    @Inject(EXAMPLE_REPOSITORY) private readonly repo: IExampleRepository,
    private readonly events: EventEmitter2,
  ) {}

  async execute(input: CreateExampleInput): Promise<Result<CreateExampleOutput>> {
    try {
      const existing = await this.repo.findByName(input.name);
      if (existing) {
        return Fail.conflict(
          `${input.name} já existe`,
          `${input.name} já existe`,
          "EXAMPLE_ALREADY_EXISTS",
        );
      }

      const example = await this.repo.save(
        new Example({
          id: crypto.randomUUID(),
          name: input.name,
          status: "active",
          createdAt: new Date(),
        }),
      );

      this.events.emit("example.created", new ExampleCreatedEvent(example.id, example.name));

      return ok({ id: example.id, name: example.name });
    } catch (error) {
      return Fail.internal(
        "Erro ao criar exemplo",
        "Erro ao criar exemplo",
        "EXAMPLE_CREATE_ERROR",
      );
    }
  }
}
```

### 4.4 Infrastructure — Schema DrizzleORM e Repositório

O schema fica em `shared/infrastructure/database/schema/` pois é infraestrutura compartilhada. A entidade de domínio continua isolada em `domain/entities/`.

```typescript
// src/shared/infrastructure/database/schema/examples.schema.ts

import { pgTable, uuid, varchar, pgEnum, timestamp } from "drizzle-orm/pg-core";

export const exampleStatusEnum = pgEnum("example_status", ["active", "inactive"]);

export const examples = pgTable("examples", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  status: exampleStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ExampleRow = typeof examples.$inferSelect;
export type NewExampleRow = typeof examples.$inferInsert;
```

```typescript
// src/modules/example/infrastructure/repositories/example.repository.ts

import { Injectable, Inject } from "@nestjs/common";
import { eq, and, SQL } from "drizzle-orm";
import { DATABASE_TOKEN, Database } from "@shared/infrastructure/database/database.connection";
import { TransactionContext } from "@shared/infrastructure/database/transaction-context";
import { examples } from "@shared/infrastructure/database/schema/examples.schema";
import {
  IExampleRepository,
  ExampleFilters,
} from "../../domain/repositories/example.repository.interface";

@Injectable()
export class ExampleRepository implements IExampleRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  // Usa o db transacional quando disponível, senão o db principal
  private get conn() {
    return TransactionContext.getDb();
  }

  async findById(id: string): Promise<Example | null> {
    const [row] = await this.conn.select().from(examples).where(eq(examples.id, id)).limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findAll(filters: ExampleFilters): Promise<Example[]> {
    const conditions: SQL[] = [];
    if (filters.status) conditions.push(eq(examples.status, filters.status));

    const rows = await this.conn
      .select()
      .from(examples)
      .where(conditions.length ? and(...conditions) : undefined);

    return rows.map((r) => this.toDomain(r));
  }

  async save(example: Example): Promise<Example> {
    const [row] = await this.conn
      .insert(examples)
      .values({
        id: example.id,
        name: example.name,
        status: example.status,
        createdAt: example.createdAt,
      })
      .returning();
    return this.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.conn.delete(examples).where(eq(examples.id, id));
  }

  private toDomain(row: typeof examples.$inferSelect): Example {
    return new Example({
      id: row.id,
      name: row.name,
      status: row.status,
      createdAt: row.createdAt,
    });
  }
}
```

### 4.5 Presentation — Controller

```typescript
// src/modules/example/presentation/controllers/example.controller.ts

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { JwtGuard } from "@shared/presentation/guards/jwt.guard";
import { CurrentUser } from "@shared/presentation/decorators/current-user.decorator";
import { Public } from "@shared/presentation/decorators/public.decorator";
import { CreateExampleDto } from "../dtos/create-example.dto";
import { CreateExampleUseCase } from "../../application/use-cases/create-example.use-case";
import { FindExampleUseCase } from "../../application/use-cases/find-example.use-case";

@Controller("examples")
@UseGuards(JwtGuard)
export class ExampleController {
  constructor(
    private readonly createUseCase: CreateExampleUseCase,
    private readonly findUseCase: FindExampleUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: CreateExampleDto, @CurrentUser() user: JwtPayload) {
    return this.createUseCase.execute({ name: body.name, requesterId: user.sub });
  }

  @Get(":id")
  @Public()
  findOne(@Param("id") id: string) {
    return this.findUseCase.execute(id);
  }
}
```

### 4.6 Module

```typescript
// src/modules/example/example.module.ts

import { Module } from "@nestjs/common";
import { EXAMPLE_REPOSITORY } from "./domain/repositories/example.repository.interface";
import { ExampleRepository } from "./infrastructure/repositories/example.drizzle.repository";
import { CreateExampleUseCase } from "./application/use-cases/create-example.use-case";
import { FindExampleUseCase } from "./application/use-cases/find-example.use-case";
import { ExampleController } from "./presentation/controllers/example.controller";

@Module({
  controllers: [ExampleController],
  providers: [
    { provide: EXAMPLE_REPOSITORY, useClass: ExampleRepository },
    CreateExampleUseCase,
    FindExampleUseCase,
  ],
  exports: [EXAMPLE_REPOSITORY],
})
export class ExampleModule {}
```

---

## 5. @Transactional (DrizzleORM, banco único)

O DrizzleORM já gerencia commit e rollback internamente via `db.transaction()`. O `TransactionContext` armazena o `tx` (objeto de transação) no `AsyncLocalStorage` para que os repositórios o peguem automaticamente — sem precisar receber `tx` como parâmetro.

### Conexão e tipo Database

````typescript
// src/shared/infrastructure/database/database.connection.ts

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as examplesSchema from './schema/examples.schema';
// import * as usersSchema from './schema/users.schema';

const schema = {
  ...examplesSchema,
  // ...usersSchema,
};

export type Database = ReturnType<typeof drizzle<typeof schema>>;
export const DATABASE_TOKEN = Symbol('DATABASE');

export function createDatabaseConnection(): Database {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    max: 10,
  });
  return drizzle(pool, { schema });
}

### TransactionContext

```typescript
// src/shared/infrastructure/database/transaction-context.ts

import { AsyncLocalStorage } from 'async_hooks';
import { Database } from './database.connection';

const storage = new AsyncLocalStorage<Database>();
let registeredDb: Database | null = null;

export class TransactionContext {
  static register(db: Database): void {
    registeredDb = db;
  }

  // Retorna o tx ativo se estiver numa transação, senão o db principal
  static getDb(): Database {
    return storage.getStore() ?? registeredDb!;
  }

  static isActive(): boolean {
    return !!storage.getStore();
  }

  static async run<T>(fn: () => Promise<T>): Promise<T> {
    if (!registeredDb) throw new Error('Database not registered.');

    // Transação aninhada reutiliza o tx já ativo
    if (this.isActive()) return fn();

    return registeredDb.transaction(async (tx) => {
      return storage.run(tx as unknown as Database, fn);
      // O drizzle faz commit automaticamente ao resolver, rollback ao rejeitar
    });
  }
}
````

### @Transactional Decorator

```typescript
// src/shared/infrastructure/database/transactional.decorator.ts

import { TransactionContext } from "./transaction-context";

export function Transactional(): MethodDecorator {
  return (_target, _key, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
      return TransactionContext.run(() => original.apply(this, args));
    };
    return descriptor;
  };
}
```

### DatabaseModule

```typescript
// src/shared/infrastructure/database/database.module.ts

import { Module, OnModuleInit } from "@nestjs/common";
import { DATABASE_TOKEN, createDatabaseConnection, Database } from "./database.connection";
import { TransactionContext } from "./transaction-context";

@Module({
  providers: [
    {
      provide: DATABASE_TOKEN,
      useFactory: () => createDatabaseConnection(),
    },
  ],
  exports: [DATABASE_TOKEN],
})
export class DatabaseModule implements OnModuleInit {
  constructor() {}

  // Registra o db no contexto depois que o módulo inicializa
  onModuleInit() {
    // O provider já criou a instância; pegamos via token
  }
}
```

> **Nota:** para registrar no `TransactionContext`, injete o `DATABASE_TOKEN` no `onModuleInit`:

```typescript
export class DatabaseModule implements OnModuleInit {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  onModuleInit() {
    TransactionContext.register(this.db);
  }
}
```

### Como usar

```typescript
// No use case — decora o método que precisa de atomicidade
@Injectable()
export class TransferUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: IAccountRepository,
    @Inject(LEDGER_REPOSITORY) private readonly ledger: ILedgerRepository,
  ) {}

  @Transactional()
  async execute(input: TransferInput): Promise<Result<void>> {
    try {
      await this.accounts.debit(input.fromId, input.amount);  // TransactionContext.getDb() retorna tx
      await this.accounts.credit(input.toId, input.amount);   // mesma transação
      await this.ledger.record(input);                        // mesma transação
      return ok();
    } catch (error) {
      return Fail.internal('Falha na transferência', 'Falha na transferência', 'TRANSFER_ERROR');
    }
  }
}

// No repositório — conn usa tx se disponível
private get conn() {
  return TransactionContext.getDb();
}
```

**Comportamento:**

- Sem `@Transactional`: `getDb()` retorna o `db` principal, cada query usa conexão própria do pool
- Com `@Transactional`: `getDb()` retorna o `tx`, todas as queries ficam na mesma transação
- Chamadas aninhadas: `isActive()` previne transação dentro de transação — reutiliza o `tx` já ativo
- Rollback: automático se qualquer `Promise` dentro do `db.transaction()` rejeitar

---

## 6. Event-Driven

Usa `@nestjs/event-emitter` (EventEmitter2) para desacoplar efeitos colaterais dos use cases.

### Instalação

```bash
pnpm add @nestjs/event-emitter
```

### Contrato do Evento

```typescript
// src/shared/domain/events/example.events.ts

export class ExampleCreatedEvent {
  readonly name = "example.created";

  constructor(
    public readonly id: string,
    public readonly exampleName: string,
    public readonly occurredAt = new Date(),
  ) {}
}
```

### Registro Global

```typescript
// src/app.module.ts
import { EventEmitterModule } from "@nestjs/event-emitter";

@Module({
  imports: [EventEmitterModule.forRoot({ wildcard: false, delimiter: ".", global: true })],
})
export class AppModule {}
```

### Emitir no Use Case

```typescript
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class CreateExampleUseCase {
  constructor(private readonly events: EventEmitter2) {}

  async execute(input: CreateExampleInput): Promise<Result<CreateExampleOutput>> {
    // ... lógica de criação
    this.events.emit("example.created", new ExampleCreatedEvent(example.id, example.name));
    return ok({ id: example.id });
  }
}
```

### Listener

```typescript
// src/shared/infrastructure/listeners/example.listener.ts

import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { ExampleCreatedEvent } from "../../domain/events/example.events";

@Injectable()
export class ExampleCreatedListener {
  @OnEvent("example.created")
  async handle(event: ExampleCreatedEvent): Promise<void> {
    // efeito colateral: enviar email, atualizar cache, etc.
  }
}
```

```typescript
// src/shared/infrastructure/listeners/listeners.module.ts

@Module({
  providers: [ExampleCreatedListener],
})
export class ListenersModule {}
```

---

## 7. Decorators Utilitários

### @Public — Pular autenticação

```typescript
// src/shared/presentation/decorators/public.decorator.ts

import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### @CurrentUser — Extrair payload do JWT

```typescript
// src/shared/presentation/decorators/current-user.decorator.ts

import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### @Traced — Rastreamento de performance

```typescript
// src/shared/presentation/decorators/traced.decorator.ts

export function Traced(name: string): MethodDecorator {
  return (_target, _key, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const start = performance.now();
      try {
        const result = await original.apply(this, args);
        const ms = performance.now() - start;
        // plugar aqui: OpenTelemetry, DataDog, Sentry trace, etc.
        console.debug(`[${name}] ok ${ms.toFixed(1)}ms`);
        return result;
      } catch (error) {
        const ms = performance.now() - start;
        console.error(`[${name}] error ${ms.toFixed(1)}ms`, error);
        throw error;
      }
    };

    return descriptor;
  };
}
```

### JwtGuard com @Public

```typescript
// src/shared/presentation/guards/jwt.guard.ts

import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

---

## 8. DTOs e Validação

```typescript
// src/modules/example/presentation/dtos/create-example.dto.ts

import { IsString, IsNotEmpty, MaxLength } from "class-validator";

export class CreateExampleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
```

**Configuração da pipe global no main.ts:**

```typescript
// src/main.ts

import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3000, "0.0.0.0");
}
bootstrap();
```

---

## 9. Respostas HTTP

| Situação                       | Status    | Origem                                    |
| ------------------------------ | --------- | ----------------------------------------- |
| `ok(data)`                     | 200 / 201 | ResultInterceptor — retorna `result.data` |
| `ok()` sem data                | 200 / 204 | ResultInterceptor — retorna `undefined`   |
| `Fail.notFound(...)`           | 404       | ResultInterceptor → HttpException         |
| `Fail.forbidden(...)`          | 403       | ResultInterceptor → HttpException         |
| `Fail.conflict(...)`           | 409       | ResultInterceptor → HttpException         |
| `Fail.internal(...)`           | 500       | ResultInterceptor → HttpException         |
| DTO inválido (class-validator) | 400       | ValidationPipe → HttpExceptionFilter      |
| Exceção não tratada            | 500       | HttpExceptionFilter                       |

**Corpo de sucesso:**

```json
// POST /examples → 201
{ "id": "uuid", "name": "Meu Exemplo" }
```

**Corpo de erro de domínio** (vindo do `ResultInterceptor`):

```json
// GET /examples/99 → 404 (produção)
{ "message": "Exemplo não encontrado" }

// GET /examples/99 → 404 (DEBUG_MODE=true)
{ "message": "Example id=99 not found", "code": "EXAMPLE_NOT_FOUND" }
```

**Corpo de erro de validação** (vindo do `HttpExceptionFilter`):

```json
// POST /examples com body inválido → 400
{
  "statusCode": 400,
  "error": "validation_error",
  "message": ["name must be a string"],
  "timestamp": "2026-04-27T12:00:00.000Z",
  "path": "/examples"
}
```

---

## 10. Checklist para Novo Módulo

```
[ ] Criar pasta src/modules/<nome>/
[ ] domain/entities/<nome>.entity.ts        — classe com props privadas e métodos de domínio
[ ] domain/repositories/<nome>.repository.interface.ts — interface + Symbol
[ ] application/use-cases/<acao>-<nome>.use-case.ts    — retorna Result<T>
[ ] shared/infrastructure/database/schema/<nome>s.schema.ts — pgTable + $inferSelect
[ ] infrastructure/repositories/<nome>.drizzle.repository.ts — usa TransactionContext.getDb()
[ ] presentation/dtos/<acao>-<nome>.dto.ts  — class-validator
[ ] presentation/controllers/<nome>.controller.ts       — retorna Result<T> diretamente
[ ] <nome>.module.ts                         — registra provide/useClass para o Symbol
[ ] Adicionar <NomeModule> em AppModule.imports
[ ] Adicionar `import * as <nome>Schema from './schema/<nome>s.schema'` em database.connection.ts e incluir no objeto schema
```

---

## 11. Swagger e @ApiDoc

O padrão separa a configuração de documentação do controller em dois lugares: o decorator `@ApiDoc` (composição de decorators do Swagger) e um arquivo `.docs.ts` por módulo (os dados de cada endpoint). O controller fica limpo, sem ruído de anotações Swagger inline.

### @ApiDoc — Decorator Composto

```typescript
// src/shared/presentation/decorators/api-doc.decorator.ts

import { applyDecorators, Type } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiBody, ApiCookieAuth, ApiTags } from "@nestjs/swagger";

interface ApiDocConfig {
  summary: string;
  description?: string;
  auth?: "cookie" | "none";
  body?: Type<unknown>;
  tags?: string[];
  responses?: {
    status: number;
    description: string;
    type?: Type<unknown>;
  }[];
}

export function ApiDoc(config: ApiDocConfig) {
  const decorators = [ApiOperation({ summary: config.summary, description: config.description })];

  if (config.tags?.length) {
    decorators.push(ApiTags(...config.tags));
  }

  if (config.auth === "cookie") {
    decorators.push(ApiCookieAuth("session"));
  }

  if (config.body) {
    decorators.push(ApiBody({ type: config.body }));
  }

  config.responses?.forEach((r) =>
    decorators.push(ApiResponse({ status: r.status, description: r.description, type: r.type })),
  );

  return applyDecorators(...decorators);
}
```

### Response DTOs com @ApiProperty

```typescript
// src/modules/example/presentation/dtos/example-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ExampleDto {
  @ApiProperty({ description: "ID do recurso", example: "uuid-v4" })
  id: string;

  @ApiProperty({ description: "Nome", example: "Meu Exemplo" })
  name: string;

  @ApiProperty({ enum: ["active", "inactive"], example: "active" })
  status: "active" | "inactive";

  @ApiProperty({ description: "Data de criação", example: "2026-04-27T12:00:00.000Z" })
  createdAt: Date;
}

export class CreateExampleResponseDto {
  @ApiProperty({ type: () => ExampleDto })
  example: ExampleDto;
}

export class PaginatedExampleResponseDto {
  @ApiProperty({ type: () => [ExampleDto] })
  data: ExampleDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  perPage: number;

  @ApiProperty({ example: 5 })
  lastPage: number;
}

// Para erros — reutilizado em todas as respostas de erro
export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: "EXAMPLE_NOT_FOUND" })
  error: string;

  @ApiProperty({ example: "Exemplo não encontrado" })
  message: string;

  @ApiPropertyOptional({ example: "2026-04-27T12:00:00.000Z" })
  timestamp?: string;

  @ApiPropertyOptional({ example: "/examples/99" })
  path?: string;
}
```

### Arquivo .docs.ts do Módulo

O arquivo centraliza a config de todos os endpoints do módulo. O controller importa e referencia pelo nome.

```typescript
// src/modules/example/presentation/docs/example.docs.ts

import { CreateExampleDto } from "../dtos/create-example.dto";
import {
  CreateExampleResponseDto,
  PaginatedExampleResponseDto,
  ErrorResponseDto,
} from "../dtos/example-response.dto";

export const ExampleDocs = {
  create: {
    summary: "Criar exemplo",
    description: `Cria um novo exemplo.

**Auth:** Cookie de sessão obrigatório
**Guards:** JwtGuard`,
    auth: "cookie" as const,
    body: CreateExampleDto,
    responses: [
      { status: 201, description: "Exemplo criado", type: CreateExampleResponseDto },
      { status: 400, description: "Dados inválidos", type: ErrorResponseDto },
      { status: 401, description: "Não autenticado", type: ErrorResponseDto },
      { status: 409, description: "Já existe", type: ErrorResponseDto },
    ],
  },

  findOne: {
    summary: "Buscar exemplo por ID",
    auth: "none" as const,
    responses: [
      { status: 200, description: "Exemplo encontrado", type: CreateExampleResponseDto },
      { status: 404, description: "Não encontrado", type: ErrorResponseDto },
    ],
  },

  list: {
    summary: "Listar exemplos",
    description: "Lista paginada de exemplos. Suporta filtro por status.",
    auth: "cookie" as const,
    responses: [
      { status: 200, description: "Lista paginada", type: PaginatedExampleResponseDto },
      { status: 401, description: "Não autenticado", type: ErrorResponseDto },
    ],
  },

  delete: {
    summary: "Remover exemplo",
    auth: "cookie" as const,
    responses: [
      { status: 204, description: "Removido com sucesso" },
      { status: 401, description: "Não autenticado", type: ErrorResponseDto },
      { status: 404, description: "Não encontrado", type: ErrorResponseDto },
    ],
  },
};
```

### Controller com @ApiDoc

```typescript
// src/modules/example/presentation/controllers/example.controller.ts

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@shared/presentation/guards/jwt.guard";
import { CurrentUser } from "@shared/presentation/decorators/current-user.decorator";
import { Public } from "@shared/presentation/decorators/public.decorator";
import { ApiDoc } from "@shared/presentation/decorators/api-doc.decorator";
import { ExampleDocs } from "../docs/example.docs";
import { CreateExampleDto } from "../dtos/create-example.dto";

@ApiTags("examples")
@Controller("examples")
@UseGuards(JwtGuard)
export class ExampleController {
  constructor(
    private readonly createUseCase: CreateExampleUseCase,
    private readonly findUseCase: FindExampleUseCase,
    private readonly listUseCase: ListExamplesUseCase,
    private readonly deleteUseCase: DeleteExampleUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiDoc(ExampleDocs.create)
  create(@Body() body: CreateExampleDto, @CurrentUser() user: JwtPayload) {
    return this.createUseCase.execute({ name: body.name, requesterId: user.sub });
  }

  @Get(":id")
  @Public()
  @ApiDoc(ExampleDocs.findOne)
  findOne(@Param("id") id: string) {
    return this.findUseCase.execute(id);
  }

  @Get()
  @ApiDoc(ExampleDocs.list)
  list(@CurrentUser() user: JwtPayload) {
    return this.listUseCase.execute({ requesterId: user.sub });
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc(ExampleDocs.delete)
  delete(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.deleteUseCase.execute({ id, requesterId: user.sub });
  }
}
```

### Setup do Swagger no main.ts

```typescript
// src/main.ts

import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("API")
      .setVersion("1.0")
      .addCookieAuth("session")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(3000, "0.0.0.0");
}
bootstrap();
```

**Swagger disponível em:** `http://localhost:3000/docs` (apenas fora de produção)

### Estrutura de arquivos de docs no módulo

```
presentation/
├── controllers/
│   └── example.controller.ts      ← usa @ApiDoc(ExampleDocs.create)
├── docs/
│   └── example.docs.ts            ← ExampleDocs = { create, findOne, list, delete }
└── dtos/
    ├── create-example.dto.ts      ← request: @IsString, @IsNotEmpty
    └── example-response.dto.ts    ← response: @ApiProperty
```

### Checklist de documentação por endpoint

```
[ ] Response DTO criado com @ApiProperty em todos os campos
[ ] Entrada documentada com @ApiProperty no request DTO
[ ] Entrada referenciada em ExampleDocs.xxx.body
[ ] Todos os status possíveis mapeados em .responses[]
[ ] auth: 'cookie' ou 'none' definido corretamente
[ ] @ApiTags no controller (nome do recurso no plural)
```

---

## 12. Dependências do package.json

```json
{
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-fastify": "^11.0.0",
    "@nestjs/jwt": "^11.0.0",
    "@nestjs/passport": "^11.0.0",
    "@nestjs/event-emitter": "^2.0.0",
    "@nestjs/swagger": "^8.0.0",
    "drizzle-orm": "^0.44.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.0",
    "fastify": "^4.0.0",
    "pg": "^8.0.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0"
  }
}
```
