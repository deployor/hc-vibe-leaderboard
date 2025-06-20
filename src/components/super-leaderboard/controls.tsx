import { motion } from "framer-motion";
import { MessageSquare, Users, Calendar, TrendingUp, Globe, Search } from "lucide-react";
import { SortSelector } from "./sort-selector";
import React from "react";

interface ControlButtonProps {
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    onClick: () => void;
    activeGradient: string;
}

const ControlButton = ({ label, icon: Icon, isActive, onClick, activeGradient }: ControlButtonProps) => (
    <motion.div whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.95 }} className="relative" style={{ rotate: -1 }}>
        <button onClick={onClick} className={`relative p-0.5 rounded-lg overflow-hidden transition-all duration-300 ${isActive ? activeGradient : "bg-slate-700"}`}>
            <div className="relative bg-slate-800/90 hover:bg-slate-800/80 backdrop-blur-sm px-5 py-2.5 rounded-[5px] transition-all duration-300">
                <span className={`flex items-center justify-center font-semibold transition-colors duration-300 ${isActive ? "text-white" : "text-slate-300"}`}>
                    <Icon size={16} className="mr-2" /> {label}
                </span>
            </div>
        </button>
    </motion.div>
);

interface ControlsProps {
    view: string;
    setView: (view: string) => void;
    filter: string;
    setFilter: (filter: string) => void;
    sort: string;
    setSort: (sort: string) => void;
    search: string;
    setSearch: (search: string) => void;
}

export const Controls = ({ view, setView, filter, setFilter, sort, setSort, search, setSearch }: ControlsProps) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-center gap-4 flex-wrap">
                <ControlButton label="Posts" icon={MessageSquare} isActive={view === 'posts'} onClick={() => setView('posts')} activeGradient="bg-gradient-to-r from-purple-500 to-pink-500" />
                <ControlButton label="Users" icon={Users} isActive={view === 'users'} onClick={() => setView('users')} activeGradient="bg-gradient-to-r from-purple-500 to-pink-500" />
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 flex flex-wrap justify-between items-center gap-4">
                <div className="flex gap-4 flex-wrap">
                    <ControlButton label="Day" icon={Calendar} isActive={filter === 'day'} onClick={() => setFilter('day')} activeGradient="bg-gradient-to-r from-blue-500 to-purple-500" />
                    <ControlButton label="Week" icon={Calendar} isActive={filter === 'week'} onClick={() => setFilter('week')} activeGradient="bg-gradient-to-r from-blue-500 to-purple-500" />
                    <ControlButton label="Month" icon={Calendar} isActive={filter === 'month'} onClick={() => setFilter('month')} activeGradient="bg-gradient-to-r from-blue-500 to-purple-500" />
                    <ControlButton label="Year" icon={TrendingUp} isActive={filter === 'year'} onClick={() => setFilter('year')} activeGradient="bg-gradient-to-r from-blue-500 to-purple-500" />
                    <ControlButton label="All Time" icon={Globe} isActive={filter === 'all'} onClick={() => setFilter('all')} activeGradient="bg-gradient-to-r from-blue-500 to-purple-500" />
                </div>

                {view === 'posts' && <SortSelector sort={sort} setSort={setSort} />}

                {view === 'users' && (
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-slate-700/80 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}; 