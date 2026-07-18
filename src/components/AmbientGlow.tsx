export function AmbientGlow() {
  return (
    <>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#5B8CFF]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#14B8A6]/10 rounded-full blur-[150px] pointer-events-none" />
    </>
  )
}
