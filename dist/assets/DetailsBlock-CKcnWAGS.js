import{o as e}from"./rolldown-runtime-CMxvf4Kt.js";import{sn as t,vn as n}from"./vendor-react-1ezbWvR3.js";var r=e(n(),1),i=t(),a=({title:e,children:t,defaultOpen:n=!1,className:a=``})=>{let[o,s]=(0,r.useState)(n),c=(0,r.useRef)(null);(0,r.useEffect)(()=>{c.current&&(c.current.open=o)},[o]);let l=()=>{s(!o)};return(0,i.jsxs)(`details`,{ref:c,className:`details-block ${a}`,open:o,children:[(0,i.jsxs)(`summary`,{onClick:e=>{e.preventDefault(),l()},className:`details-summary`,children:[(0,i.jsx)(`span`,{className:`summary-title`,children:e}),(0,i.jsx)(`svg`,{className:`chevron ${o?`open`:``}`,width:`16`,height:`16`,viewBox:`0 0 16 16`,fill:`none`,"aria-hidden":`true`,children:(0,i.jsx)(`path`,{d:`M4 6L8 10L12 6`,stroke:`currentColor`,strokeWidth:`1.5`,strokeLinecap:`round`,strokeLinejoin:`round`})})]}),(0,i.jsx)(`div`,{className:`details-content`,children:t}),(0,i.jsx)(`style`,{jsx:!0,children:`
        .details-block {
          display: block;
          width: 100%;
        }
        
        .details-summary {
          cursor: pointer;
          font-family: var(--heading-font);
          font-size: 0.875rem;
          font-weight: 500;
          color: rgb(var(--fg));
          padding: 0.75rem 1rem;
          border: 1px solid rgb(var(--border));
          border-radius: 6px;
          background: rgb(var(--surface));
          display: flex;
          align-items: center;
          justify-content: space-between;
          list-style: none;
          transition: background-color 0.2s ease;
          user-select: none;
        }
        
        .details-summary:hover {
          background: rgba(var(--fg), 0.03);
        }
        
        .details-block[open] .details-summary {
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
        }
        
        .details-summary::-webkit-details-marker {
          display: none;
        }
        
        .summary-title {
          flex: 1;
        }
        
        .chevron {
          transition: transform 0.2s ease;
          color: rgb(var(--fg-muted));
        }
        
        .chevron.open {
          transform: rotate(180deg);
        }
        
        .details-content {
          padding: 1rem;
          border: 1px solid rgb(var(--border));
          border-top: none;
          border-radius: 0 0 6px 6px;
          background: rgb(var(--card));
        }
      `})]})};export{a as t};
//# sourceMappingURL=DetailsBlock-CKcnWAGS.js.map