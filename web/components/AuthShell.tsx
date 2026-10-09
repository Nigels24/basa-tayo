const LETTERS = ['Aa', 'Bb', 'Kk', 'Dd', 'Ee', 'Gg', 'Hh', 'Ii', 'Ll', 'Mm', 'Nn', 'Ng', 'Oo', 'Pp', 'Rr', 'Ss', 'Tt', 'Uu', 'Ww', 'Yy'];

/** The two-column frame shared by the Log in and Gumawa ng account pages. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between gap-6 bg-ink p-12 text-white md:flex">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-6xl font-bold leading-none">
          {LETTERS.map((l, i) => (
            <span key={l} className={['text-mango', 'text-[#ff8a65]', 'text-[#7fb8f0]'][i % 3]}>
              {l}
            </span>
          ))}
        </div>
        <div>
          <h2 className="max-w-sm text-4xl font-extrabold leading-tight">Basa Tayo! Teacher Module</h2>
          <p className="mt-3 max-w-md text-[#aab5c7]">
            Manage the Filipino word bank, lessons tied to MATATAG competencies, pupil accounts and
            progress reports for your Grade 1 class.
          </p>
        </div>
      </div>

      <div className="grid place-items-center p-8">{children}</div>
    </div>
  );
}
