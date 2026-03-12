import { motion } from 'framer-motion'

export default function StartScreen({ onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-lg"
    >
      <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-xl p-8 md:p-10 text-center">
        <h1 className="font-sans text-2xl md:text-3xl font-semibold text-zinc-100 mb-2">
          OSmosis
        </h1>
        <p className="text-zinc-400 text-sm md:text-base mb-8">
          10 scenarios · 60 seconds each · bullet-point responses
        </p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="w-full py-3 px-6 rounded-xl bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
        >
          Start session
        </motion.button>
      </div>
    </motion.div>
  )
}
