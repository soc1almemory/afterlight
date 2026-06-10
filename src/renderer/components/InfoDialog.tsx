import type { ReactNode } from 'react';
import type { LanguageCode } from '../../shared/types';
import changelogEn from '../content/changelog.en.md?raw';
import changelogRu from '../content/changelog.ru.md?raw';
import helpEn from '../content/help.en.md?raw';
import helpRu from '../content/help.ru.md?raw';
import { translate } from '../i18n';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface InfoDialogProps {
  kind: 'changelog' | 'help';
  onClose: () => void;
}

type MarkdownBlock =
  | {
      level: number;
      text: string;
      type: 'heading';
    }
  | {
      text: string;
      type: 'paragraph';
    }
  | {
      items: string[];
      type: 'list';
    };

const documents: Record<LanguageCode, Record<InfoDialogProps['kind'], string>> = {
  en: {
    changelog: changelogEn,
    help: helpEn,
  },
  ru: {
    changelog: changelogRu,
    help: helpRu,
  },
};

export const InfoDialog = ({ kind, onClose }: InfoDialogProps) => {
  const language = useTaskStore((state) => state.settings.language);
  const document = parseMarkdownDocument(documents[language][kind]);

  return (
    <div className="dialog-overlay info-overlay" role="presentation" onMouseDown={onClose}>
      <section className="info-dialog" aria-label={document.title} onMouseDown={(event) => event.stopPropagation()}>
        <header className="dialog-heading">
          <div>
            <h2>{document.title}</h2>
            {document.intro ? <p>{document.intro}</p> : null}
          </div>
          <button type="button" aria-label={translate(language, 'close')} onClick={onClose}>
            <img src={assetUrl('popup-close-icon.svg')} alt="" />
          </button>
        </header>
        <MarkdownContent blocks={document.blocks} />
      </section>
    </div>
  );
};

const MarkdownContent = ({ blocks }: { blocks: MarkdownBlock[] }) => (
  <div className="info-markdown">
    {blocks.map((block, index) => {
      if (block.type === 'heading') {
        const Heading = block.level <= 2 ? 'h3' : 'h4';
        return <Heading key={`${block.type}-${index}`}>{renderInlineMarkdown(block.text)}</Heading>;
      }

      if (block.type === 'list') {
        return (
          <ul key={`${block.type}-${index}`}>
            {block.items.map((item) => (
              <li key={item}>{renderInlineMarkdown(item)}</li>
            ))}
          </ul>
        );
      }

      return <p key={`${block.type}-${index}`}>{renderInlineMarkdown(block.text)}</p>;
    })}
  </div>
);

const parseMarkdownDocument = (markdown: string) => {
  const blocks = parseMarkdownBlocks(markdown);
  const titleBlockIndex = blocks.findIndex((block) => block.type === 'heading' && block.level === 1);
  const titleBlock = titleBlockIndex >= 0 ? blocks[titleBlockIndex] : undefined;
  const title = titleBlock?.type === 'heading' ? titleBlock.text : 'Afterlight';
  const blocksAfterTitle = titleBlockIndex >= 0 ? blocks.filter((_block, index) => index !== titleBlockIndex) : blocks;
  const introBlockIndex = blocksAfterTitle.findIndex((block) => block.type === 'paragraph');
  const introBlock = introBlockIndex >= 0 ? blocksAfterTitle[introBlockIndex] : undefined;
  const intro = introBlock?.type === 'paragraph' ? introBlock.text : undefined;
  const contentBlocks = introBlockIndex >= 0
    ? blocksAfterTitle.filter((_block, index) => index !== introBlockIndex)
    : blocksAfterTitle;

  return {
    blocks: contentBlocks,
    intro,
    title,
  };
};

const parseMarkdownBlocks = (markdown: string): MarkdownBlock[] => {
  const blocks: MarkdownBlock[] = [];
  const paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({ text: paragraphLines.join(' ').trim(), type: 'paragraph' });
    paragraphLines.length = 0;
  };

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    blocks.push({ items: listItems, type: 'list' });
    listItems = [];
  };

  markdown.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = trimmedLine.match(/^(#{1,4})\s+(.+)$/);

    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({ level: headingMatch[1].length, text: headingMatch[2].trim(), type: 'heading' });
      return;
    }

    const listMatch = trimmedLine.match(/^[-*]\s+(.+)$/);

    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1].trim());
      return;
    }

    flushList();
    paragraphLines.push(trimmedLine);
  });

  flushParagraph();
  flushList();
  return blocks;
};

const renderInlineMarkdown = (text: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (token.startsWith('**')) {
      nodes.push(<strong key={`${match.index}-strong`}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<code key={`${match.index}-code`}>{token.slice(1, -1)}</code>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
};
