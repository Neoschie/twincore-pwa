"use client";

import Image from "next/image";
import { PresenceParticles } from "./PresenceParticles";
type PresenceState =
  | "calm"
  | "reflective"
  | "thinking"
  | "protective";

type Props = {

state?: PresenceState;

size?: number;

presence?: number;

energy?: number;

intensity?: number;

};

export function PresenceOrb({

state="reflective",

size=420,

presence=.7,

energy=.65,

intensity=.8,

}:Props){

const glow={
calm:"from-cyan-400/25 via-blue-500/20 to-transparent",
reflective:"from-fuchsia-400/25 via-cyan-400/20 to-transparent",
thinking:"from-violet-500/30 via-cyan-400/20 to-transparent",
protective:"from-red-500/30 via-fuchsia-500/20 to-transparent",
}[state];

return (

<div
  className="relative flex items-center justify-center"
  style={{

width:size,

height:size,

opacity:presence,

filter:`brightness(${1+energy*.15}) saturate(${1+intensity*.18})`

}}
>

  {/* Aura */}
  <div
    className={`
      absolute
      inset-0
      rounded-full
      bg-gradient-radial
      ${glow}
      blur-[110px]
      animate-presenceGlow
    `}
  />

  <div
  className="
    absolute
    inset-0
    pointer-events-none
  "
>
  <PresenceParticles />
</div>

  {/* Future Energy Ring */}
  <div
    className="
      absolute
      inset-[8%]
      rounded-full
      border
      border-white/5
      opacity-30
    "
  />

<div
className="
absolute
inset-0
animate-presenceBreath
"
>

<Image
src="/brand/twinme-orb.png"
alt="Presence Orb"
fill
priority
className="
object-contain
select-none
pointer-events-none
"
/>

</div>

</div>

);

}