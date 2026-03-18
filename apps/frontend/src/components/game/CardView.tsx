import { motion } from 'framer-motion';

export interface CardViewProps {
  rank: string;
  suit: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const suitSymbols: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export function CardView({ rank, suit, selected, disabled, onClick }: CardViewProps) {
  const symbol = suitSymbols[suit] ?? suit;
  const isRed = suit === 'hearts' || suit === 'diamonds';
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.95 }}
      onClick={disabled ? undefined : onClick}
      className={`relative flex h-20 w-14 flex-col items-center justify-between rounded-md border px-1 py-1 text-xs ${
        disabled ? 'opacity-40' : 'bg-white text-black'
      } ${selected ? 'ring-2 ring-yellow-400 -translate-y-1' : ''}`}
    >
      <span className={`self-start ${isRed ? 'text-red-600' : 'text-black'}`}>{rank}</span>
      <span className={`text-lg ${isRed ? 'text-red-600' : 'text-black'}`}>{symbol}</span>
      <span className={`self-end text-[10px] ${isRed ? 'text-red-600' : 'text-black'}`}>{rank}</span>
    </motion.button>
  );
}

