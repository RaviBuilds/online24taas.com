import React from 'react';
import { PortableText } from '@portabletext/react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

const components = {
  block: {
    h1: ({children}:{children?:any}) => <h1>{children}</h1>,
    h2: ({children}:{children?:any}) => <h2>{children}</h2>,
    h3: ({children}:{children?:any}) => <h3>{children}</h3>,
    h4: ({children}:{children?:any}) => <h4>{children}</h4>,
    h5: ({children}:{children?:any}) => <h5>{children}</h5>,
    h6: ({children}:{children?:any}) => <h6>{children}</h6>,
    blockquote: ({children}:{children?:any}) => <blockquote>{children}</blockquote>,
    normal: ({children}:{children?:any}) => <p>{children}</p>,
  },
  marks: {
    strong: ({children}:{children?:any}) => <strong>{children}</strong>,
    em: ({children}:{children?:any}) => <em>{children}</em>,
    underline: ({children}:{children?:any}) => <u>{children}</u>,
    link: ({value,children}:{value?:any;children:any}) => <a href={value?.href} target="_blank" rel="noopener noreferrer">{children}</a>,
  },
  list: {
    bullet: ({children}:{children?:any}) => <ul>{children}</ul>,
    number: ({children}:{children?:any}) => <ol>{children}</ol>,
  },
  listItem: ({children}:{children?:any}) => <li>{children}</li>,
  types: {
    image: ({value}:{value:any}) => (
      <figure>
        {value?.src ? null : null}
        <img src={value?.asset?.url || value?.src || ''} alt={value?.alt || ''} />
        {value?.caption ? <figcaption>{value.caption}</figcaption> : null}
      </figure>
    ),
    rawHtml: ({value}:{value:any}) => <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(value?.html || '') }} />,
  },
};

export default function PortableTextRenderer({ value }:{value:any}) {
  return <PortableText value={value || []} components={components} />;
}