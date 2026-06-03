export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-200 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`px-6 py-5 border-b border-slate-100 bg-slate-50/50 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }) {
  return <h2 className={`font-semibold text-lg text-slate-800 flex items-center ${className}`}>{children}</h2>;
}

export function CardContent({ children, className = '' }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}
