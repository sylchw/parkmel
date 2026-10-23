import PilotApp from "../components/pilot/PilotApp";
export const dynamic="force-dynamic";
export default function Home(){return <PilotApp now={new Date().toISOString()}/>;}
