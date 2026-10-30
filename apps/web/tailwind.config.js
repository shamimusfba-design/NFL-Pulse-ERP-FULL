/** Tailwind is used only by the Central Planning pages (T&A, Approval Desk, Capacity, Subcontract).
 *  preflight (Tailwind's global CSS reset) is OFF so every other page keeps its current look. */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};
