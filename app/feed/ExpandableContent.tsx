'use client';

import { useState } from 'react';

type ExpandableContentProps = {
  content: string;
  fragmentId: string;
};

export function ExpandableContent({ content, fragmentId }: ExpandableContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Heuristic: show hint if content is likely truncated
  const showHint = content.length > 80 || content.includes('\n');

  const toggleExpanded = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpanded(e);
    }
  };

  return (
    <div
      className="contentToggle"
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? 'Collapse content' : 'Expand content'}
      onClick={toggleExpanded}
      onKeyDown={handleKeyDown}
      title={showHint ? content : ''}
    >
      <div className={`contentClamp ${isExpanded ? 'isExpanded' : 'isCollapsed'}`}>
        {content}
      </div>
      {showHint && !isExpanded && <span className="ellipsisHint" aria-hidden="true">…</span>}
      {showHint && isExpanded && <span className="ellipsisHint" aria-hidden="true">▲</span>}
    </div>
  );
}

