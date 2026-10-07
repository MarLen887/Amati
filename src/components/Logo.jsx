// Logo oficial del colibrí (public/logo.jpeg).
export default function Logo({ size = 36, withText = false }) {
  return (
    <span className="logo">
      <img src="/logo.jpeg" width={size} height={size} alt={withText ? '' : 'Amati'} />
      {withText && <span className="logo-text">Amati</span>}
    </span>
  );
}
