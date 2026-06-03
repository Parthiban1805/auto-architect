export function Button({ children, variant = 'primary', className = '', loading = false, ...props }) {
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white shadow-sm focus:ring-brand-500",
    secondary: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm focus:ring-slate-200",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600",
  };
  
  return (
    <button 
      className={`${baseStyle} ${variants[variant]} px-4 py-2 text-sm ${className}`} 
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {typeof children === 'string' && children.includes('Generate Blueprint') ? 'Agents are working...' : 'Loading...'}
        </>
      ) : children}
    </button>
  );
}
