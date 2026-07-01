type Props = {
  value: string;
  onChange: (v: string) => void;

  onSend: (text?: string) => void;

  isListening: boolean;

  voiceOutputEnabled: boolean;

  handsFreeEnabled: boolean;

};

export function TwinMeInput({

value,

onChange,

onSend,

isListening,

voiceOutputEnabled,

handsFreeEnabled

}:Props){

return(

<div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">

<input
  value={value}
  onChange={(e) => onChange(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSend(value);
    }
  }}
placeholder="Talk to TwinMe..."
className="
w-full
rounded-2xl
border
border-white/10
bg-black/20
px-4
py-4
text-white
outline-none
placeholder:text-white/40
"
/>

<div className="mt-3 flex gap-2">

<button
  onClick={() => onSend(value)}
  disabled={!value.trim()}
className="
flex-1
rounded-2xl
bg-cyan-500/20
py-3
font-semibold
text-cyan-100
disabled:cursor-not-allowed
disabled:opacity-40
"
>

Send

</button>

<button
className="
rounded-2xl
border
border-white/10
px-4
py-3
text-white/70
"
>

{isListening ? "🎙️" : "🎤"}

</button>

</div>

<div className="mt-3 flex gap-2">

<div className="text-xs text-white/45">

Voice:

<span className="ml-1 text-cyan-300">

{voiceOutputEnabled ? "ON" : "OFF"}

</span>

</div>


<div className="text-xs text-white/45">

Hands-Free:

<span className="ml-1 text-fuchsia-300">

{handsFreeEnabled ? "ON" : "OFF"}

</span>

</div>

</div>

</div>

);

}