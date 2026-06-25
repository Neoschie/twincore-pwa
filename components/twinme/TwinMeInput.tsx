type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function TwinMeInput({
  value,
  onChange,
}: Props) {

  return (

<div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">

<input
value={value}
onChange={(e)=>onChange(e.target.value)}
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
className="
flex-1
rounded-2xl
bg-cyan-500/20
py-3
font-semibold
text-cyan-100
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

🎤

</button>

</div>

</div>

  );

}