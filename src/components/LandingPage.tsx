import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Network, 
  Shield, 
  Sparkles, 
  FileText, 
  ArrowRight, 
  Plus, 
  User as UserIcon, 
  LogIn, 
  UserPlus, 
  Cpu,
  Database,
  Lock,
  Unlock,
  RefreshCw,
  GitPullRequest,
  CheckCircle2,
  ChevronDown,
  Info,
  HelpCircle,
  X
} from "lucide-react";

import SupportAndLegal from "./SupportAndLegal";

interface LandingPageProps {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  isSignUp: boolean;
  setIsSignUp: (val: boolean) => void;
  authError: string;
  setAuthError: (val: string) => void;
  handleEmailAuth: (e: React.FormEvent) => void;
  handleGoogleLogin: () => void;
  onBypassLanding?: () => void;
}

interface SandboxNode {
  id: string;
  name: string;
  role: string;
  birthYear: number;
  anecdote: string;
  x: number; // percentage width
  y: number; // percentage height
  connections: string[]; // target ids
  color: string;
  avatarSeed: string;
  isMissing?: boolean;
}

const INITIAL_NODES: SandboxNode[] = [
  {
    id: "node-1",
    name: "Alistair Kinsfolk",
    role: "Great-Grandfather",
    birthYear: 1894,
    anecdote: "A railroad pioneer who carried a small copper compass through two world wars. The compass still functions today.",
    x: 20,
    y: 15,
    connections: ["node-3"],
    color: "from-amber-500 to-orange-600",
    avatarSeed: "alistair",
  },
  {
    id: "node-2",
    name: "Beatrix Vance",
    role: "Great-Grandmother",
    birthYear: 1902,
    anecdote: "The town's first female astronomer. She charted over 80 constellations using a brass telescope on her farm balcony.",
    x: 40,
    y: 12,
    connections: ["node-3"],
    color: "from-teal-400 to-emerald-600",
    avatarSeed: "beatrix",
  },
  {
    id: "node-3",
    name: "Charles Kinsfolk",
    role: "Paternal Grandfather",
    birthYear: 1928,
    anecdote: "A master clockmaker who built the historic city tower clock. He could recognize any watch brand by its ticking sound.",
    x: 30,
    y: 45,
    connections: ["node-5"],
    color: "from-blue-500 to-indigo-600",
    avatarSeed: "charles",
  },
  {
    id: "node-4",
    name: "Diana Sterling",
    role: "Paternal Grandmother",
    birthYear: 1934,
    anecdote: "A botanical illustrator who documented rare alpine flora. Her detailed watercolor albums are archived in the state museum.",
    x: 55,
    y: 42,
    connections: ["node-5"],
    color: "from-rose-400 to-pink-600",
    avatarSeed: "diana",
  },
  {
    id: "node-5",
    name: "Edward Kinsfolk",
    role: "Father",
    birthYear: 1961,
    anecdote: "A structural engineer who designed suspension bridges. He always said: 'Build bridges that outlast your lifetime.'",
    x: 45,
    y: 75,
    connections: [],
    color: "from-violet-500 to-purple-600",
    avatarSeed: "edward",
  },
  {
    id: "node-6",
    name: "Fiona Mercer",
    role: "Mother",
    birthYear: 1965,
    anecdote: "A dedicated concert pianist and teacher. She believed music was the ultimate bridge across separate generations.",
    x: 75,
    y: 72,
    connections: ["node-5"],
    color: "from-cyan-400 to-blue-600",
    avatarSeed: "fiona",
  },
  {
    id: "node-7",
    name: "Arthur Vance (Lost Uncle)",
    role: "Missing Branch Found",
    birthYear: 1958,
    anecdote: "RECONNECTED! Found through secure zero-knowledge pedigree matching. Arthur has been searching for his long-lost sister Fiona for over three decades.",
    x: 82,
    y: 32,
    connections: ["node-6"],
    color: "from-fuchsia-500 to-pink-600 animate-pulse",
    avatarSeed: "arthur",
    isMissing: true
  }
];

export default function LandingPage({
  email,
  setEmail,
  password,
  setPassword,
  isSignUp,
  setIsSignUp,
  authError,
  setAuthError,
  handleEmailAuth,
  handleGoogleLogin
}: LandingPageProps) {
  const [selectedNode, setSelectedNode] = useState<SandboxNode | null>(INITIAL_NODES[4]);
  const [isEncryptedView, setIsEncryptedView] = useState(true);
  const [decryptedText, setDecryptedText] = useState("");
  const [showSupportModal, setShowSupportModal] = useState(false);
  const authSectionRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to auth forms section
  const scrollToAuth = () => {
    authSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Animate decrypted story text character-by-character for visual flair
  useEffect(() => {
    if (!selectedNode) return;
    if (isEncryptedView) {
      // Create cipher slurry
      const chars = "XYZ#$%@&*!0198273645ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let count = 0;
      const interval = setInterval(() => {
        const dummyText = selectedNode.anecdote
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < count) return selectedNode.anecdote[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("");
        setDecryptedText(dummyText);
        count += 2;
        if (count >= selectedNode.anecdote.length + 10) {
          setIsEncryptedView(false);
          setDecryptedText(selectedNode.anecdote);
          clearInterval(interval);
        }
      }, 35);
      return () => clearInterval(interval);
    } else {
      setDecryptedText(selectedNode.anecdote);
    }
  }, [selectedNode, isEncryptedView]);

  const handleNodeClick = (node: SandboxNode) => {
    setIsEncryptedView(true);
    setSelectedNode(node);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-x-hidden font-sans select-none">
      
      {/* Abstract Glowing Aura Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-10 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 left-10 w-[450px] h-[450px] bg-emerald-500/5 rounded-full blur-[100px]" />
        
        {/* Decorative dynamic grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Navigation Header */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-900 bg-slate-950/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Network className="h-5.5 w-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-sans font-black text-xl tracking-tight text-white">Kinly</span>
              <span className="text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono font-bold px-1.5 py-0.2 rounded-full">v2.1</span>
            </div>
            <span className="text-[9px] font-mono font-extrabold text-slate-500 tracking-widest block uppercase">Zero-Knowledge Genealogist</span>
          </div>
        </div>

        <button
          id="nav-cta-scroll"
          onClick={scrollToAuth}
          className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
        >
          <LogIn className="h-4 w-4 text-blue-500" />
          <span>Portal Access</span>
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 min-h-[90vh] flex flex-col justify-center py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Copy (5 Cols) */}
          <div className="lg:col-span-5 space-y-8 text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-extrabold uppercase tracking-widest"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
              <span>Locate. Reconnect. Cryptographically Secure.</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.08]">
                Find your <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">missing family</span> and reconnect securely.
              </h2>
              <p className="text-sm text-slate-400 font-sans leading-relaxed">
                Unlock lost lineages and unify fractured branches of your ancestry tree. Discover long-lost family links using anonymized match queries while keeping raw private history fully secured.
              </p>
            </motion.div>

            {/* Core Animated Hero CTA */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2"
            >
              <button
                id="hero-btn-start-journey"
                onClick={scrollToAuth}
                className="w-full sm:w-auto px-8 py-4.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white font-bold text-sm tracking-tight shadow-xl shadow-blue-500/20 hover:scale-[1.03] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2.5 group"
              >
                <span>Find Missing Kin & Connect</span>
                <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>

            {/* Quick trust metrics */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-900 text-center lg:text-left">
              <div>
                <span className="text-2xl font-black text-white block">LinMatch</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mt-0.5">Missing Finder</span>
              </div>
              <div>
                <span className="text-2xl font-black text-white block">Reconnected</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mt-0.5">Secure Linkage</span>
              </div>
              <div>
                <span className="text-2xl font-black text-white block">AES-GCM</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mt-0.5">Zero Leakage</span>
              </div>
            </div>
          </div>

          {/* Animated Constellation Canvas (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-5 w-full h-[550px] relative">
            
            {/* Interactive Vault Frame */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md shadow-2xl relative flex flex-col justify-between h-full overflow-hidden">
              
              {/* Header inside frame */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
                  <h3 className="text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
                    Interactive Tree Decryption Sandbox
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                  <Unlock className="h-3 w-3" />
                  <span>Symmetric Cryptography Sandbox</span>
                </div>
              </div>

              {/* Constellation Canvas area */}
              <div className="relative flex-1 bg-slate-950/80 border border-slate-900/80 rounded-2xl overflow-hidden my-4">
                
                {/* SVG connection paths */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {INITIAL_NODES.map((source) => 
                    source.connections.map((targetId) => {
                      const target = INITIAL_NODES.find(n => n.id === targetId);
                      if (!target) return null;
                      return (
                        <motion.line
                          key={`${source.id}-${targetId}`}
                          x1={`${source.x}%`}
                          y1={`${source.y}%`}
                          x2={`${target.x}%`}
                          y2={`${target.y}%`}
                          stroke="rgba(59, 130, 246, 0.4)"
                          strokeWidth="2"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1.5, ease: "easeInOut" }}
                        />
                      );
                    })
                  )}
                </svg>

                {/* Simulated Floating Ancestor Nodes */}
                {INITIAL_NODES.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  
                  // Generate custom random offset phases to give natural asynchronous drifting
                  const phaseX = (node.birthYear % 5) * 2;
                  const phaseY = (node.birthYear % 7) * 2;

                  return (
                    <motion.div
                      key={node.id}
                      animate={{
                        y: [0, -6 - phaseY, 0],
                        x: [0, 4 + phaseX, 0]
                      }}
                      transition={{
                        duration: 6 + phaseX,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                      onClick={() => handleNodeClick(node)}
                    >
                      {/* Pulse Ring */}
                      {isSelected && (
                        <div className="absolute -inset-2.5 rounded-full border-2 border-blue-500/30 animate-ping pointer-events-none"></div>
                      )}

                      {/* Floating Circle */}
                      <div className={`w-11 h-11 rounded-full p-0.5 bg-gradient-to-br ${node.color} shadow-lg shadow-black/50 transition-all ${
                        isSelected ? "ring-4 ring-blue-500/40 scale-110" : "hover:ring-2 hover:ring-slate-700 hover:scale-105"
                      } flex items-center justify-center`}>
                        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                          <img
                            src={`https://api.dicebear.com/7.x/personas/svg?seed=${node.avatarSeed}`}
                            alt={node.name}
                            className="w-9.5 h-9.5 opacity-95 group-hover:scale-110 transition-transform object-cover"
                          />
                        </div>
                      </div>

                      {/* Tiny Tag */}
                      <div className={`absolute top-full mt-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold font-mono px-2 py-0.5 rounded-md shadow-md whitespace-nowrap transition-colors ${
                        isSelected ? "bg-blue-600 text-white" : "bg-slate-900/90 text-slate-400 group-hover:text-slate-200 border border-slate-800"
                      }`}>
                        {node.name.split(" ")[0]} ({node.birthYear})
                      </div>
                    </motion.div>
                  );
                })}

                {/* Decryption overlay badge */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[10px] bg-slate-900/95 border border-slate-800/80 px-2.5 py-1 rounded-lg text-slate-400 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping"></span>
                  <span>Click any floating node to decrypt their record</span>
                </div>
              </div>

              {/* Live Sandbox Drawer (Details) */}
              <AnimatePresence mode="wait">
                {selectedNode && (
                  <motion.div
                    key={selectedNode.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="bg-slate-950/90 p-4.5 rounded-2xl border border-slate-800/80 space-y-2 relative"
                  >
                    {/* Glowing lock/unlock icon */}
                    <div className="absolute right-4 top-4">
                      {isEncryptedView ? (
                        <div className="flex items-center gap-1.5 text-[9px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-mono font-bold animate-pulse">
                          <Lock className="h-3 w-3" />
                          <span>CYPHER ACTIVE</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono font-bold">
                          <Unlock className="h-3 w-3" />
                          <span>DECRYPTED</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-sans font-extrabold text-sm text-white">
                        {selectedNode.name}
                      </h4>
                      <p className="text-[10px] font-mono font-bold text-slate-500 tracking-wider">
                        {selectedNode.role} • Born {selectedNode.birthYear}
                      </p>
                    </div>

                    {/* Encrypted text field */}
                    <div className="bg-slate-900 border border-slate-800/50 p-3 rounded-xl font-mono text-[11px] leading-relaxed text-slate-400 min-h-[50px] whitespace-pre-line select-none">
                      {decryptedText}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Downward indicator */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none opacity-50 animate-bounce">
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest">Scroll To Explore</span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </div>
          </div>

        </div>
      </section>

      {/* Capabilities Section (Reveal on Scroll) */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 py-24 border-t border-slate-900">
        <div className="max-w-2xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest">
            <Cpu className="h-3.5 w-3.5" />
            <span>Under The Hood</span>
          </div>
          <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Unify missing branches, securely.
          </h3>
          <p className="text-sm text-slate-400 font-sans leading-relaxed">
            Unlike commercial platforms that monetize or expose your raw ancestral information, Kinly enables matching of missing family lineages using zero-knowledge hashing. Reconnect safely without compromise.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Capability Card 1 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="bg-slate-900/30 p-8 rounded-3xl border border-slate-900 hover:border-slate-800 transition-all space-y-6 relative group overflow-hidden"
          >
            {/* Animated background flare */}
            <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />

            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-md">
              <Shield className="h-6 w-6" />
            </div>
            
            <div className="space-y-2">
              <h4 className="font-sans font-bold text-lg text-white">Symmetric Client Cryptography</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Vault logs, exact birthdates, and lineage links are fully encrypted in your local browser state using premium client symmetric ciphers. Decryption keys are never transmitted.
              </p>
            </div>

            {/* Visual Real Cryptographic Diagram */}
            <div className="h-28 w-full bg-slate-950/80 border border-slate-900 rounded-2xl flex items-center justify-center p-4 relative overflow-hidden">
              <div className="absolute top-1 left-2 font-mono text-[8px] text-slate-500 uppercase tracking-widest">Symmetric Key Cipher Stream</div>
              <div className="flex items-center gap-4 z-10 w-full justify-around">
                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">PLAINTEXT</div>
                  <span className="text-[9px] text-slate-600 font-mono mt-1">"Charles K."</span>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                    className="h-8 w-8 rounded-full border border-dashed border-blue-500/40 flex items-center justify-center bg-blue-500/5"
                  >
                    <Lock className="h-4 w-4 text-blue-400" />
                  </motion.div>
                  <span className="text-[8px] font-mono text-blue-400 mt-1">AES-256</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/5 px-2 py-1 rounded-md border border-emerald-500/20">CIPHERTEXT</div>
                  <span className="text-[9px] text-slate-500 font-mono mt-1 truncate max-w-[80px]">U2FsdGVkX19H...</span>
                </div>
              </div>
            </div>

            {/* Cryptographic interactive display */}
            <div className="bg-slate-950 border border-slate-900 p-3 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Client State</span>
                <span className="font-mono text-[10px] text-emerald-400 font-bold block">ENC_MD_SECURE</span>
              </div>
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
            </div>
          </motion.div>

          {/* Capability Card 2 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="bg-slate-900/30 p-8 rounded-3xl border border-slate-900 hover:border-slate-800 transition-all space-y-6 relative group overflow-hidden"
          >
            {/* Animated background flare */}
            <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />

            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-md">
              <Database className="h-6 w-6" />
            </div>
            
            <div className="space-y-2">
              <h4 className="font-sans font-bold text-lg text-white">Zero-Friction Offline Sync</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Work perfectly during travels or in remote regions. Changes persist securely on your local disk database, syncing automatically to Firestore once connection returns.
              </p>
            </div>

            {/* Real Offline-to-Cloud sync pipeline graphic */}
            <div className="h-28 w-full bg-slate-950/80 border border-slate-900 rounded-2xl flex items-center justify-center p-4 relative overflow-hidden">
              <div className="absolute top-1 left-2 font-mono text-[8px] text-slate-500 uppercase tracking-widest">Replicated State Pipeline</div>
              <div className="flex items-center justify-between w-full px-4 z-10">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-lg bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Database className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 mt-1.5 font-bold">IndexedDB</span>
                </div>
                
                <div className="flex-1 flex items-center justify-center px-2">
                  <div className="w-full h-1 bg-slate-900 rounded-full relative overflow-hidden border border-slate-800">
                    <motion.div
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                      className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-lg bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Network className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 mt-1.5 font-bold">Firestore</span>
                </div>
              </div>
            </div>

            {/* Sync interactive display */}
            <div className="bg-slate-950 border border-slate-900 p-3 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Local Mirror Store</span>
                <span className="font-mono text-[10px] text-blue-400 font-bold block flex items-center gap-1.5">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Synced • Local Copy Safe
                </span>
              </div>
              <CheckCircle2 className="h-4.5 w-4.5 text-blue-500" />
            </div>
          </motion.div>

          {/* Capability Card 3 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-slate-900/30 p-8 rounded-3xl border border-slate-900 hover:border-slate-800 transition-all space-y-6 relative group overflow-hidden"
          >
            {/* Animated background flare */}
            <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />

            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-md">
              <GitPullRequest className="h-6 w-6" />
            </div>
            
            <div className="space-y-2">
              <h4 className="font-sans font-bold text-lg text-white">Anonymized Lineage Match</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Optionally matches non-identifiable, hashed birth year and parent-child indices across the network, detecting shared lineages without exposing your records.
              </p>
            </div>

            {/* Real Network pedigree match constellation graphic */}
            <div className="h-28 w-full bg-slate-950/80 border border-slate-900 rounded-2xl flex items-center justify-center p-4 relative overflow-hidden">
              <div className="absolute top-1 left-2 font-mono text-[8px] text-slate-500 uppercase tracking-widest">Anonymized LinMatch nodes</div>
              <div className="relative w-full h-full flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full opacity-65">
                  <line x1="20%" y1="70%" x2="50%" y2="30%" stroke="rgba(168, 85, 247, 0.4)" strokeWidth="1.5" strokeDasharray="3 3" />
                  <line x1="80%" y1="70%" x2="50%" y2="30%" stroke="rgba(168, 85, 247, 0.4)" strokeWidth="1.5" strokeDasharray="3 3" />
                  <line x1="50%" y1="30%" x2="50%" y2="10%" stroke="rgba(168, 85, 247, 0.6)" strokeWidth="1.5" />
                </svg>
                
                <div className="absolute left-[15%] bottom-2 flex flex-col items-center">
                  <div className="h-5 w-5 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[8px] font-bold text-purple-300">H1</div>
                  <span className="text-[7px] font-mono text-slate-500 mt-0.5">Hash#A49B</span>
                </div>

                <div className="absolute right-[15%] bottom-2 flex flex-col items-center">
                  <div className="h-5 w-5 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[8px] font-bold text-purple-300">H2</div>
                  <span className="text-[7px] font-mono text-slate-500 mt-0.5">Hash#F821</span>
                </div>

                <div className="absolute left-[45%] top-[25%] flex flex-col items-center">
                  <div className="h-7 w-7 rounded-full bg-purple-600/30 border border-purple-400 flex items-center justify-center text-[9px] font-bold text-white shadow-lg shadow-purple-500/20 animate-pulse">MATCH</div>
                  <span className="text-[7px] font-mono text-purple-300 mt-0.5">Matched (98.6%)</span>
                </div>
              </div>
            </div>

            {/* Network match display */}
            <div className="bg-slate-950 border border-slate-900 p-3 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block">LinMatch Protocol</span>
                <span className="font-mono text-[10px] text-purple-400 font-bold block">98% Lineage Probabilities</span>
              </div>
              <CheckCircle2 className="h-4.5 w-4.5 text-purple-500" />
            </div>
          </motion.div>

        </div>
      </section>

      {/* Real High-Impact Authentication Form Section */}
      <section 
        id="auth-section" 
        ref={authSectionRef}
        className="relative z-10 w-full max-w-7xl mx-auto px-6 py-24 border-t border-slate-900 flex flex-col items-center"
      >
        <div className="w-full max-w-lg space-y-8">
          
          <div className="text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
              <Network className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Kinly Vault Portal</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Authenticate with the local vault to load your private family graph, search missing kin, and secure your lineage logs.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-2xl space-y-6 relative overflow-hidden">
            
            {/* Tab switchers */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-900">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setAuthError("");
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !isSignUp ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setAuthError("");
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSignUp ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Real Firebase Google Login button */}
            <button
              id="landing-auth-btn-google"
              onClick={handleGoogleLogin}
              className="w-full flex justify-center items-center gap-3 px-4 py-3 rounded-2xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-xs font-bold text-white shadow-md hover:border-slate-700 transition-all cursor-pointer"
            >
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-slate-900 text-slate-500 font-sans font-medium uppercase tracking-wider">
                  Or use credentials
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form id="landing-email-form" onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Email Address</label>
                <input
                  id="landing-auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full text-xs px-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Password</label>
                <input
                  id="landing-auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="w-full text-xs px-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              {authError && (
                <div className="text-xs text-rose-500 font-medium font-sans leading-relaxed bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl flex items-center gap-2">
                  <Info className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                id="landing-btn-submit-auth"
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/10 cursor-pointer transition-colors"
              >
                {isSignUp ? "Generate Secure Vault & Account" : "Open Secure Archive Portal"}
              </button>
            </form>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 flex gap-3 text-[10px] text-slate-400 leading-relaxed font-sans">
              <HelpCircle className="h-4.5 w-4.5 text-blue-500 shrink-0" />
              <span>
                By creating an archive, you generate a local symmetric-key sequence. It resides in your browser cache and is used to cryptographically translate raw personal names, birthdates, and logs.
              </span>
            </div>

          </div>

        </div>
      </section>

      {/* Mini footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 border-t border-slate-900 text-center flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-4">
        <div className="flex flex-col items-center sm:items-start gap-1">
          <span>© 2026 Kinly. All rights reserved. Built with high-security client storage.</span>
          <div className="flex items-center gap-3 mt-1.5 font-semibold text-slate-500">
            <button onClick={() => setShowSupportModal(true)} className="hover:text-blue-500 transition-colors cursor-pointer">Privacy Policy</button>
            <span>•</span>
            <button onClick={() => setShowSupportModal(true)} className="hover:text-blue-500 transition-colors cursor-pointer">Terms of Use</button>
            <span>•</span>
            <button onClick={() => setShowSupportModal(true)} className="hover:text-blue-500 transition-colors cursor-pointer">Contact Support</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span>Symmetric Vault Cryptography Secured</span>
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
        </div>
      </footer>

      {/* Support, Privacy and Terms Modal */}
      <AnimatePresence>
        {showSupportModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 p-2"
            >
              <div className="absolute top-4 right-4 z-55">
                <button
                  onClick={() => setShowSupportModal(false)}
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  title="Close support center"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-[85vh] overflow-y-auto">
                <SupportAndLegal />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
