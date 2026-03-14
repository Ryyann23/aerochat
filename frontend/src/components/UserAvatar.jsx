import iconUser1 from '../assets/img/icon_user1.png';

function hexToRgb(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  const matches = normalized.match(/^#([0-9a-fA-F]{6})$/);

  if (!matches) {
    return { r: 95, g: 201, b: 222 };
  }

  const hex = matches[1];

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function UserAvatar({ name, color, className = '' }) {
  const rgb = hexToRgb(color || '#5FC9DE');

  return (
    <span
      className={`blend-avatar ${className}`.trim()}
      style={{
        '--avatar-mask': `url("${iconUser1}")`,
        '--avatar-r': rgb.r,
        '--avatar-g': rgb.g,
        '--avatar-b': rgb.b,
      }}
      role="img"
      aria-label={name}
    >
      <img src={iconUser1} alt="" aria-hidden="true" className="blend-avatar-base" />
      <span className="blend-avatar-overlay" aria-hidden="true" />
      <span className="blend-avatar-gloss" aria-hidden="true" />
    </span>
  );
}

export default UserAvatar;
