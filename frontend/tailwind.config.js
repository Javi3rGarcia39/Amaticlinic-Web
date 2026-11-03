/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  // [ModoOscuro] Las variantes dark: se activan con la clase "dark" en <html> (la pone TemaService)
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#028090',
          dark: '#0B3D3A',
          light: '#00A896',
        },
        accent: '#02C39A',
      },
      // [Interceptores] Animacion de la barra de carga
      keyframes: {
        'barra-carga': { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(300%)' } },
      },
      animation: {
        'barra-carga': 'barra-carga 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
