export type Ok<T> = { readonly _tag: "ok"; readonly value: T };
export type Err<E> = { readonly _tag: "err"; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T, E = never>(value: T): Result<T, E> {
  return { _tag: "ok", value };
}

export function err<T = never, E = unknown>(error: E): Result<T, E> {
  return { _tag: "err", error };
}

export function isOk<T, E>(r: Result<T, E>): r is Ok<T> {
  return r._tag === "ok";
}

export function isErr<T, E>(r: Result<T, E>): r is Err<E> {
  return r._tag === "err";
}

export function map<T, U, E>(r: Result<T, E>, fn: (v: T) => U): Result<U, E> {
  return isOk(r) ? ok(fn(r.value)) : r;
}

export function flatMap<T, U, E>(r: Result<T, E>, fn: (v: T) => Result<U, E>): Result<U, E> {
  return isOk(r) ? fn(r.value) : r;
}

export function unwrapOr<T, E>(r: Result<T, E>, fallback: T): T {
  return isOk(r) ? r.value : fallback;
}
