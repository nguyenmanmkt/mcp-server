import React from 'react';
import { SYSTEM_IMAGES } from '../constants';

export const isSystemImage = (imageName: string): boolean => {
  return SYSTEM_IMAGES.some(sys => imageName === sys || imageName.startsWith(sys));
};

export const canAccessImage = (userRole: string, imageAccessLevel?: string): boolean => {
  const level = imageAccessLevel || 'free';
  if (level === 'free') return true;
  if (['admin', 'dev_user'].includes(userRole)) return true;
  if (level === 'vip' && userRole === 'vip') return true;
  return false;
};

export const formatDate = (timestamp: number): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('vi-VN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const formatBytes = (bytes: number | string): string => {
  if (!bytes) return '0 B';
  if (typeof bytes === 'string') return bytes;
  const k = 1024;
  const dm = 2;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// --- AUTH HELPERS ---
export const getAuthHeaders = () => {
  const currentUser = localStorage.getItem('currentUser');
  if (!currentUser) return {};
  try {
    const user = JSON.parse(currentUser);
    return {
      'Authorization': `Bearer ${user.token}`,
      'Content-Type': 'application/json'
    };
  } catch {
    return {};
  }
};

export const getUserId = () => {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) return null;
    try { return JSON.parse(currentUser).id; } catch { return null; }
};

// --- MARKDOWN RENDERER ---
const parseBold = (text: string, keyPrefix: string): React.ReactNode[] => {
  const children: React.ReactNode[] = [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) children.push(before);
    
    children.push(
      <strong key={`bold-${keyPrefix}-${match.index}`} className="font-extrabold text-white">
        {match[1]}
      </strong>
    );
    
    lastIndex = boldRegex.lastIndex;
  }
  const remaining = text.slice(lastIndex);
  if (remaining) children.push(remaining);
  
  return children;
};

const parseInline = (text: string): React.ReactNode[] => {
  const children: React.ReactNode[] = [];
  
  // Split by backticks for inline code
  const codeRegex = /(`[^`]+`)/g;
  const parts = text.split(codeRegex);

  parts.forEach((part, index) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
       // Inline Code
       children.push(
         <code key={`code-${index}`} className="bg-slate-700 px-1 py-0.5 rounded text-green-300 font-mono text-xs mx-0.5">
           {part.slice(1, -1)}
         </code>
       );
    } else {
       // Process Links
       const linkRegex = /\[(.*?)\]\((.*?)\)/g;
       let lastLinkIndex = 0;
       let linkMatch;
       
       while ((linkMatch = linkRegex.exec(part)) !== null) {
          const beforeLink = part.slice(lastLinkIndex, linkMatch.index);
          if (beforeLink) children.push(...parseBold(beforeLink, `${index}-${lastLinkIndex}`));
          
          children.push(
            <a 
              key={`link-${index}-${linkMatch.index}`} 
              href={linkMatch[2]} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-400 hover:text-blue-300 underline font-medium"
            >
              {linkMatch[1]}
            </a>
          );
          
          lastLinkIndex = linkRegex.lastIndex;
       }
       const remaining = part.slice(lastLinkIndex);
       if (remaining) children.push(...parseBold(remaining, `${index}-end`));
    }
  });

  return children;
};

export const renderMarkdown = (text?: string): React.ReactNode => {
  if (!text) return null;
  
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = (keyIndex: number) => {
    if (inList) {
      elements.push(
        <ul key={`list-${keyIndex}`} className="list-disc list-inside mb-3 text-slate-300 space-y-1 pl-2">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check Code Block
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End Code Block
        elements.push(
          <pre key={`codeblock-${i}`} className="bg-slate-950 border border-slate-700 p-3 rounded-lg font-mono text-xs text-green-400 overflow-x-auto my-3 whitespace-pre shadow-inner">
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        // Start Code Block
        flushList(i);
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }
    
    // Check List
    const listMatch = line.match(/^(\s*)([-*])\s+(.*)/);
    if (listMatch) {
      if (!inList) {
         inList = true;
      }
      listItems.push(<li key={`li-${i}`}>{parseInline(listMatch[3])}</li>);
      continue;
    } else {
      flushList(i);
    }
    
    // Skip completely empty lines if not in code block
    if (trimmed === '') continue;
    
    // Headings
    if (line.startsWith('# ')) {
      elements.push(<h1 key={`h1-${i}`} className="text-2xl font-bold text-blue-400 mt-6 mb-3 border-b border-slate-700 pb-2">{parseInline(line.substring(2))}</h1>);
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={`h2-${i}`} className="text-xl font-bold text-white mt-5 mb-2">{parseInline(line.substring(3))}</h2>);
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={`h3-${i}`} className="text-lg font-bold text-blue-300 mt-4 mb-2">{parseInline(line.substring(4))}</h3>);
      continue;
    }
    if (line.startsWith('#### ')) {
      elements.push(<h4 key={`h4-${i}`} className="text-base font-bold text-slate-200 mt-3 mb-1">{parseInline(line.substring(5))}</h4>);
      continue;
    }
    
    // Paragraph
    elements.push(<p key={`p-${i}`} className="mb-2 leading-relaxed text-sm text-slate-300">{parseInline(line)}</p>);
  }
  
  flushList(lines.length); // Final flush

  return <>{elements}</>;
};