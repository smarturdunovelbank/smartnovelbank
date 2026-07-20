import NavLinks from "./NavLinks";

export default function Header({ 
  title = "Smart Novel Bank", 
  subtitle 
}) {
  return (
    <header className="app-header">
      <nav className="main-nav">
        <NavLinks />
      </nav>
      <div className="header-ornament">
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 10C19 7 12 7 7 9V36C12 34 19 34 24 37C29 34 36 34 41 36V9C36 7 29 7 24 10Z" stroke="#e9c878" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M24 10V37" stroke="#e9c878" strokeWidth="2"/>
        </svg>
      </div>
      <h1>{title}</h1>
      {subtitle && <p className="subtitle text-urdu">{subtitle}</p>}
      <div className="header-divider"></div>
    </header>
  );
}
