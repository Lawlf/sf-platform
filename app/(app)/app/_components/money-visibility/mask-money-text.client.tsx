"use client";

import { Fragment, type ReactNode } from "react";

import { HideableValue } from "./hideable-value.client";

const BRL_TOKEN = /R\$\s?\d{1,3}(?:\.\d{3})*,\d{2}/g;

export function MaskMoneyText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const re = new RegExp(BRL_TOKEN);
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(<HideableValue>{match[0]}</HideableValue>);
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return (
    <>
      {nodes.map((node, i) => (
        <Fragment key={i}>{node}</Fragment>
      ))}
    </>
  );
}
