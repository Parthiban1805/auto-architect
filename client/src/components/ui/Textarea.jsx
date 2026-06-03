export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all shadow-sm text-sm text-slate-800 placeholder-slate-400 bg-white hover:border-slate-300 resize-y ${className}`}
      {...props}
    />
  );
}
