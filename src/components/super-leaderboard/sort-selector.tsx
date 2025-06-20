import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ReactionIcon } from "./reaction-icon";
import { reactionMeta } from "./lib/reaction-meta";

export const SortSelector = ({ sort, setSort }: { sort: string, setSort: (s: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { icon, name } = reactionMeta[sort] || reactionMeta.net_score;

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 flex items-center gap-2 text-white">
                Sort by:
                <ReactionIcon icon={icon} name={name} size={16} />
                <span className="font-semibold">{name}</span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full mt-2 right-0 bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-lg p-2 z-20 w-64 max-h-80 overflow-y-auto">
                        {Object.entries(reactionMeta).map(([key, { icon: ItemIcon, name }]) => (
                            <button key={key} onClick={() => { setSort(key); setIsOpen(false); }} className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-slate-700/50 text-left text-white">
                                <ReactionIcon icon={ItemIcon} name={name} size={20} />
                                {name}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}; 