import { useEffect, useState, useRef } from "react";
import { 
  useGetBotStatus, 
  getGetBotStatusQueryKey,
  useConnectBot,
  useDisconnectBot,
  useGetBotLogs,
  getGetBotLogsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Terminal, Activity, Power, PowerOff, ShieldAlert, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

const connectSchema = z.object({
  host: z.string().min(1, "Server address is required"),
  port: z.coerce.number().optional().default(25565),
  username: z.string().min(1, "Bot username is required").max(16, "Username too long"),
  version: z.string().optional(),
});

type ConnectFormValues = z.infer<typeof connectSchema>;

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Status Query
  const { data: status } = useGetBotStatus({
    query: {
      queryKey: getGetBotStatusQueryKey(),
      refetchInterval: 2000,
    }
  });

  // Logs Query
  const { data: logs } = useGetBotLogs({
    query: {
      queryKey: getGetBotLogsQueryKey(),
      refetchInterval: 3000,
    }
  });

  // Mutations
  const connectBot = useConnectBot();
  const disconnectBot = useDisconnectBot();

  // Form
  const form = useForm<ConnectFormValues>({
    resolver: zodResolver(connectSchema),
    defaultValues: {
      host: "myserver.aternos.me",
      port: 25565,
      username: "KeepAliveBot",
      version: "",
    },
  });

  const onSubmit = (data: ConnectFormValues) => {
    connectBot.mutate(
      { 
        data: {
          host: data.host,
          port: data.port,
          username: data.username,
          version: data.version || null
        } 
      },
      {
        onSuccess: () => {
          toast({
            title: "Connection Initiated",
            description: `Connecting to ${data.host} as ${data.username}`,
          });
          queryClient.invalidateQueries({ queryKey: getGetBotStatusQueryKey() });
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Connection Failed",
            description: err.error || "An unknown error occurred",
          });
        }
      }
    );
  };

  const handleDisconnect = () => {
    disconnectBot.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Disconnected",
          description: "Bot has been stopped.",
        });
        queryClient.invalidateQueries({ queryKey: getGetBotStatusQueryKey() });
      }
    });
  };

  const isConnected = status?.connected || false;
  const isConnecting = status?.connecting || false;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-sans selection:bg-primary/30">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/50 pb-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-primary">MC KeepAlive</h1>
              <p className="text-sm text-muted-foreground font-mono">SERVER_MONITOR_SYS // v1.0.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-secondary/50 backdrop-blur">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-pulse' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-muted-foreground'}`} />
            <span className="text-xs font-mono font-medium uppercase tracking-wider">
              {isConnected ? 'ONLINE' : isConnecting ? 'CONNECTING' : 'OFFLINE'}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Config & Status */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Connect Form Card */}
            <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
              <div className="p-5 border-b border-border/50 bg-secondary/20">
                <h2 className="text-sm font-semibold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                  <Cpu className="w-4 h-4 text-primary" /> Target Config
                </h2>
              </div>
              
              <div className="p-5">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="host"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Server Address</FormLabel>
                          <FormControl>
                            <Input placeholder="myserver.aternos.me" className="font-mono bg-background/50" {...field} disabled={isConnected || isConnecting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="port"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Port</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="25565" className="font-mono bg-background/50" {...field} disabled={isConnected || isConnecting} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="version"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Version</FormLabel>
                            <FormControl>
                              <Input placeholder="Auto" className="font-mono bg-background/50" {...field} disabled={isConnected || isConnecting} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Bot Username</FormLabel>
                          <FormControl>
                            <Input placeholder="KeepAliveBot" className="font-mono bg-background/50" {...field} disabled={isConnected || isConnecting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-4 flex gap-3">
                      {isConnected || isConnecting ? (
                        <Button 
                          type="button" 
                          variant="destructive" 
                          className="w-full" 
                          onClick={handleDisconnect}
                          disabled={disconnectBot.isPending}
                        >
                          <PowerOff className="w-4 h-4 mr-2" />
                          Abort
                        </Button>
                      ) : (
                        <Button 
                          type="submit" 
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                          disabled={connectBot.isPending}
                        >
                          <Power className="w-4 h-4 mr-2" />
                          Initialize Connection
                        </Button>
                      )}
                    </div>
                  </form>
                </Form>
              </div>
            </Card>

            {/* Status Panel Card */}
            <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
              <div className="p-5 border-b border-border/50 bg-secondary/20">
                <h2 className="text-sm font-semibold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                  <Activity className="w-4 h-4 text-primary" /> Telemetry
                </h2>
              </div>
              <div className="p-5 space-y-4">
                <StatusItem label="Host" value={status?.host ? `${status.host}:${status.port}` : "—"} />
                <StatusItem label="Identity" value={status?.username || "—"} />
                <StatusItem label="Version" value={status?.version || "—"} />
                
                <div className="h-px w-full bg-border/50 my-2" />
                
                <UptimeCounter uptime={status?.uptime} connected={isConnected} />
                <StatusItem label="Reconnects" value={status?.reconnectCount?.toString() || "0"} highlight={Number(status?.reconnectCount) > 0} />
                
                {status?.lastError && (
                  <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm font-mono flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="break-words">{status.lastError}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column: Terminal Logs */}
          <div className="lg:col-span-8 flex flex-col h-[800px] lg:h-auto">
            <Card className="flex-1 flex flex-col border-border/50 bg-[#0a0a0a] overflow-hidden shadow-xl ring-1 ring-white/5">
              <div className="p-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  <Terminal className="w-3.5 h-3.5 text-primary" /> System Output
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                </div>
              </div>
              
              <div className="flex-1 relative">
                <LogViewer logs={logs} />
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}

function StatusItem({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${highlight ? 'text-yellow-500' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

function UptimeCounter({ uptime, connected }: { uptime?: number | null, connected: boolean }) {
  const [currentUptime, setCurrentUptime] = useState(uptime || 0);

  useEffect(() => {
    setCurrentUptime(uptime || 0);
  }, [uptime]);

  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      setCurrentUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [connected]);

  const formatUptime = (seconds: number) => {
    if (!seconds) return "00:00:00";
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">Uptime</span>
      <span className="font-mono text-primary">{connected ? formatUptime(currentUptime) : "—"}</span>
    </div>
  );
}

function LogViewer({ logs }: { logs?: { timestamp: string, level: string, message: string }[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  if (!logs || logs.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-mono text-sm">
        Awaiting connection...
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="absolute inset-0 overflow-y-auto p-4 font-mono text-sm space-y-1 scroll-smooth">
      <AnimatePresence initial={false}>
        {logs.map((log, i) => (
          <motion.div
            key={`${log.timestamp}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-3 hover:bg-white/5 px-2 py-0.5 rounded transition-colors"
          >
            <span className="text-muted-foreground shrink-0 opacity-50 select-none">
              {format(new Date(log.timestamp), "HH:mm:ss")}
            </span>
            <span className={`shrink-0 uppercase w-10 text-xs mt-0.5 tracking-wider font-bold ${
              log.level === 'info' ? 'text-primary' : 
              log.level === 'warn' ? 'text-yellow-500' : 
              log.level === 'error' ? 'text-destructive' : 'text-foreground'
            }`}>
              {log.level}
            </span>
            <span className={`break-words ${
              log.level === 'error' ? 'text-destructive/90' : 
              log.level === 'warn' ? 'text-yellow-500/90' : 'text-foreground/90'
            }`}>
              {log.message}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
