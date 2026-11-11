import React from 'react';

interface CreatePartyButtonProps {
  readonly label: string;
  readonly onClick?: () => void;
}

export const CreatePartyButton: React.FC<CreatePartyButtonProps> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full group relative overflow-hidden py-4 px-6 rounded-2xl bg-gradient-to-r from-mercury via-indigo-600 to-mercury-light text-white font-bold text-base md:text-lg shadow-lg shadow-mercury/30 hover:shadow-mercury/50 hover:brightness-110 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 border border-white/20"
  >
    <span className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out" />
    <i className="fa-solid fa-plus-circle text-lg md:text-xl text-white group-hover:rotate-90 transition-transform duration-300" />
    <span>{label}</span>
  </button>
);

export default CreatePartyButton;
