'use client';
import { T, useT } from '@/components/LanguageProvider';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { FaChevronDown } from 'react-icons/fa';
import classNames from 'classnames';
import { CircleHelp } from 'lucide-react';
import { getDoc } from '@/docs';
import { openDoc } from './DocModal';

interface CardProps {
  title?: string;
  titleDocKey?: string;
  children?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  // when provided, the card is opened/closed by a toggle switch on the right instead of a chevron
  toggled?: boolean;
  onToggle?: (value: boolean) => void;
}

const Card: React.FC<CardProps> = ({ title, titleDocKey, children, collapsible, defaultOpen, toggled, onToggle }) => {
  const t = useT();
  const titleDoc = getDoc(titleDocKey);
  const help = titleDoc ? (
    <button
      type="button"
      aria-label={`${t(title ?? '')} — ${t('Help')}`}
      onClick={event => { event.stopPropagation(); openDoc(titleDoc); }}
      className="ml-2 inline-flex align-middle text-gray-500 hover:text-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 rounded"
    >
      <CircleHelp className="w-4 h-4" aria-hidden="true" />
    </button>
  ) : null;
  if (onToggle) {
    return (
      <section className="space-y-2 px-4 pb-2 pt-2 bg-gray-900 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {title && (
              <h2 className={classNames('text-lg font-semibold uppercase text-gray-500', toggled ? 'mb-2' : 'mb-0')}>
                {t(title ?? '')}{help}
              </h2>
            )}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={toggled}
            onClick={() => onToggle(!toggled)}
            className={classNames(
              'relative ml-2 inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2',
              toggled ? 'bg-blue-500' : 'bg-gray-600',
              'hover:bg-opacity-80',
            )}
          >
            <span className="sr-only"><T text={"Toggle"} /> {t(title ?? '')}</span>
            <span
              className={classNames(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                toggled ? 'translate-x-5' : 'translate-x-0',
              )}
            />
          </button>
        </div>
        {toggled && (
          <>
            {children ?? null}
            <div className="pt-2"></div>
          </>
        )}
      </section>
    );
  }
  if (collapsible) {
    return (
      <Disclosure as="section" className="space-y-2 px-4 pb-2 pt-2 bg-gray-900 rounded-lg" defaultOpen={defaultOpen}>
        {({ open }) => (
          <>
            <div className="flex items-center">
            <DisclosureButton className="w-full text-left flex items-center justify-between">
              <div className="flex-1">
                {title && (
                  <h2 className={classNames('text-lg mb-2 font-semibold uppercase text-gray-500', { 'mb-0': !open })}>
                    {t(title ?? '')}
                  </h2>
                )}
              </div>
              <FaChevronDown className={`ml-2 inline-block transition-transform ${open ? 'rotate-180' : ''}`} />
            </DisclosureButton>
            {help}
            </div>
            <DisclosurePanel>{children ?? null}</DisclosurePanel>
            {open && <div className="pt-2"></div>}
          </>
        )}
      </Disclosure>
    );
  }
  return (
    <section className="space-y-2 px-4 pb-4 pt-2 bg-gray-900 rounded-lg">
      {title && <h2 className="text-lg mb-2 font-semibold uppercase text-gray-500">{t(title ?? '')}{help}</h2>}
      {children ?? null}
    </section>
  );
};

export default Card;
