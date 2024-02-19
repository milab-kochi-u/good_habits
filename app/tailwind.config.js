/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./views/**/*.{html,js,ejs}'],
  theme: {
    extend: {
      animation: {
        "text-pop-up-top": "text-pop-up-top 0.5s cubic-bezier(0.600, -0.280, 0.735, 0.045)    both"
      },
      keyframes: {
        "text-pop-up-top": {
          "0%": {
            transform: "translateY(0)",
            "transform-origin": "50% 50%",
            "text-shadow": "none"
          },
          to: {
            transform: "translateY(-2px)",
            "transform-origin": "50% 50%",
            "text-shadow": "1px 1px 2px gray"
          }
        }
      }
    }
  },
  plugins: [],
}