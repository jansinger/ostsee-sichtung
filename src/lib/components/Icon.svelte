<script lang="ts">
	// Import all icons we use in the project
	import MapPin from '~icons/lucide/map-pin';
	import Calendar from '~icons/lucide/calendar';
	import Wind from '~icons/lucide/wind';
	import Cloud from '~icons/lucide/cloud';
	import Mail from '~icons/lucide/mail';
	import Eye from '~icons/lucide/eye';
	import Trash2 from '~icons/lucide/trash-2';
	import Settings from '~icons/lucide/settings';
	import AlertCircle from '~icons/lucide/alert-circle';
	import Check from '~icons/lucide/check';
	import X from '~icons/lucide/x';
	import ChevronDown from '~icons/lucide/chevron-down';
	import ChevronRight from '~icons/lucide/chevron-right';
	import Filter from '~icons/lucide/filter';
	import Download from '~icons/lucide/download';
	import Columns from '~icons/lucide/columns';
	import User from '~icons/lucide/user';
	import LogOut from '~icons/lucide/log-out';
	import Github from '~icons/lucide/github';
	import Upload from '~icons/lucide/upload';
	import Loader2 from '~icons/lucide/loader-2';
	import Info from '~icons/lucide/info';
	import ShieldAlert from '~icons/lucide/shield-alert';
	import Waves from '~icons/lucide/waves';
	import Activity from '~icons/lucide/activity';
	import Camera from '~icons/lucide/camera';
	import Thermometer from '~icons/lucide/thermometer';
	import Gauge from '~icons/lucide/gauge';
	import Binoculars from '~icons/lucide/binoculars';
	import SkipForward from '~icons/lucide/skip-forward';
	import Anchor from '~icons/lucide/anchor';
	import MessageSquare from '~icons/lucide/message-square';
	import Save from '~icons/lucide/save';
	import ArrowLeft from '~icons/lucide/arrow-left';
	import Play from '~icons/lucide/play';
	import FileText from '~icons/lucide/file-text';
	import Images from '~icons/lucide/images';
	import Video from '~icons/lucide/video';
	import CircleAlert from '~icons/lucide/circle-alert';
	import CircleCheck from '~icons/lucide/circle-check';
	import CircleX from '~icons/lucide/circle-x';
	import SquareX from '~icons/lucide/square-x';
	import List from '~icons/lucide/list';
	import TriangleAlert from '~icons/lucide/triangle-alert';
	import SquarePen from '~icons/lucide/square-pen';
	import PenLine from '~icons/lucide/pen-line';
	import PenOff from '~icons/lucide/pen-off';
	import ChartPie from '~icons/lucide/chart-pie';
	import TrendingUp from '~icons/lucide/trending-up';
	import Users from '~icons/lucide/users';
	import CircleHelp from '~icons/lucide/circle-help';
	import Music from '~icons/lucide/music';
	import Archive from '~icons/lucide/archive';
	import File from '~icons/lucide/file';
	import RefreshCw from '~icons/lucide/refresh-cw';
	import Home from '~icons/lucide/home';
	import FileSearch from '~icons/lucide/file-search';
	import Lock from '~icons/lucide/lock';
	import CheckCircle from '~icons/lucide/check-circle';
	import Baby from '~icons/lucide/baby';
	import Car from '~icons/lucide/car';
	import Clock from '~icons/lucide/clock';
	import CloudRain from '~icons/lucide/cloud-rain';
	import Hash from '~icons/lucide/hash';
	import Fish from '~icons/lucide/fish';
	import Globe from '~icons/lucide/globe';
	import MessageCircle from '~icons/lucide/message-circle';
	import MousePointer from '~icons/lucide/mouse-pointer';
	import Move from '~icons/lucide/move';
	import Navigation from '~icons/lucide/navigation';
	import Navigation2 from '~icons/lucide/navigation-2';
	import Phone from '~icons/lucide/phone';
	import ShieldCheck from '~icons/lucide/shield-check';
	import Ship from '~icons/lucide/ship';
	import Skull from '~icons/lucide/skull';
	import ToggleLeft from '~icons/lucide/toggle-left';
	import UserCheck from '~icons/lucide/user-check';
	import Zap from '~icons/lucide/zap';
	import Mountain from '~icons/lucide/mountain';
import BookOpen from '~icons/lucide/book-open';
import Map from '~icons/lucide/map';
import Heart from '~icons/lucide/heart';
import Scale from '~icons/lucide/scale';
import Send from '~icons/lucide/send';
import Smartphone from '~icons/lucide/smartphone';
import Gem from '~icons/lucide/gem';
import LoaderPinwheel from '~icons/lucide/loader-pinwheel';
import FileType from '~icons/lucide/file-type';
import HardDrive from '~icons/lucide/hard-drive';
import BarChart from '~icons/lucide/bar-chart';
import Braces from '~icons/lucide/braces';
import FileCode from '~icons/lucide/file-code';

	// Icon map for dynamic icon lookup
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const iconMap: Record<string, any> = {
		'lucide:map-pin': MapPin,
		'lucide:calendar': Calendar,
		'lucide:wind': Wind,
		'lucide:cloud': Cloud,
		'lucide:mail': Mail,
		'lucide:eye': Eye,
		'lucide:trash-2': Trash2,
		'lucide:settings': Settings,
		'lucide:alert-circle': AlertCircle,
		'lucide:check': Check,
		'lucide:x': X,
		'lucide:chevron-down': ChevronDown,
		'lucide:chevron-right': ChevronRight,
		'lucide:filter': Filter,
		'lucide:download': Download,
		'lucide:columns': Columns,
		'lucide:user': User,
		'lucide:log-out': LogOut,
		'lucide:github': Github,
		'lucide:upload': Upload,
		'lucide:loader-2': Loader2,
		'lucide:info': Info,
		'lucide:shield-alert': ShieldAlert,
		'lucide:waves': Waves,
		'lucide:activity': Activity,
		'lucide:camera': Camera,
		'lucide:thermometer': Thermometer,
		'lucide:gauge': Gauge,
		'lucide:binoculars': Binoculars,
		'lucide:skip-forward': SkipForward,
		'lucide:anchor': Anchor,
		'lucide:message-square': MessageSquare,
		'lucide:save': Save,
		'lucide:arrow-left': ArrowLeft,
		'lucide:play': Play,
		'lucide:file-text': FileText,
		'lucide:images': Images,
		'lucide:video': Video,
		'lucide:circle-alert': CircleAlert,
		'lucide:circle-check': CircleCheck,
		'lucide:circle-x': CircleX,
		'lucide:square-x': SquareX,
		'lucide:list': List,
		'lucide:triangle-alert': TriangleAlert,
		'lucide:square-pen': SquarePen,
		'lucide:pen-line': PenLine,
		'lucide:pen-off': PenOff,
		'lucide:chart-pie': ChartPie,
		'lucide:trending-up': TrendingUp,
		'lucide:users': Users,
		'lucide:circle-help': CircleHelp,
		'lucide:music': Music,
		'lucide:archive': Archive,
		'lucide:file': File,
		'lucide:refresh-cw': RefreshCw,
		'lucide:home': Home,
		'lucide:file-search': FileSearch,
		'lucide:lock': Lock,
		'lucide:check-circle': CheckCircle,
		'lucide:baby': Baby,
		'lucide:car': Car,
		'lucide:clock': Clock,
		'lucide:cloud-rain': CloudRain,
		'lucide:hash': Hash,
		'lucide:fish': Fish,
		'lucide:globe': Globe,
		'lucide:message-circle': MessageCircle,
		'lucide:mouse-pointer': MousePointer,
		'lucide:move': Move,
		'lucide:navigation': Navigation,
		'lucide:navigation-2': Navigation2,
		'lucide:phone': Phone,
		'lucide:shield-check': ShieldCheck,
		'lucide:ship': Ship,
		'lucide:skull': Skull,
		'lucide:toggle-left': ToggleLeft,
		'lucide:user-check': UserCheck,
		'lucide:zap': Zap,
		'lucide:mountain': Mountain,
		'lucide:book-open': BookOpen,
		'lucide:map': Map,
		'lucide:heart': Heart,
		'lucide:scale': Scale,
		'lucide:send': Send,
		'lucide:smartphone': Smartphone,
		'lucide:gem': Gem,
		'lucide:loader-pinwheel': LoaderPinwheel,
		'lucide:file-type': FileType,
		'lucide:hard-drive': HardDrive,
		'lucide:bar-chart': BarChart,
		'lucide:braces': Braces,
		'lucide:file-code': FileCode
	};

	interface Props {
		icon: string;
		width?: string | number;
		height?: string | number;
		class?: string;
		[key: string]: unknown;
	}

	let { icon, width = '20', height = '20', class: className = '', ...rest }: Props = $props();

	// Get the icon component based on the icon name - Svelte 5 runes syntax
	let IconComponent = $derived(iconMap[icon] || null);
</script>

{#if IconComponent}
	<IconComponent {width} {height} class={className} {...rest} />
{:else}
	<!-- Debug info for missing icons -->
	<span class="inline-block {className}" style="width: {width}px; height: {height}px;" title="Missing icon: {icon}">?</span>
{/if}