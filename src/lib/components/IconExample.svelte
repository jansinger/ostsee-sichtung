<script lang="ts">
	// Example of how to use unplugin-icons
	// Import icons directly from virtual modules
	import IconMapPin from '~icons/lucide/map-pin';
	import IconCalendar from '~icons/lucide/calendar';
	import IconWind from '~icons/lucide/wind';
	import IconCloud from '~icons/lucide/cloud';
	import IconMail from '~icons/lucide/mail';
	import IconEye from '~icons/lucide/eye';
	import IconTrash2 from '~icons/lucide/trash-2';
	import IconSettings from '~icons/lucide/settings';
	import IconAlertCircle from '~icons/lucide/alert-circle';
	import IconCheck from '~icons/lucide/check';
	import IconX from '~icons/lucide/x';
	import IconChevronDown from '~icons/lucide/chevron-down';
	import IconChevronRight from '~icons/lucide/chevron-right';
	import IconFilter from '~icons/lucide/filter';
	import IconDownload from '~icons/lucide/download';
	import IconColumns from '~icons/lucide/columns';
	import IconUser from '~icons/lucide/user';
	import IconLogOut from '~icons/lucide/log-out';
	import IconGithub from '~icons/lucide/github';
	import IconUpload from '~icons/lucide/upload';
	import IconLoader2 from '~icons/lucide/loader-2';
	import IconInfo from '~icons/lucide/info';
	import IconShieldAlert from '~icons/lucide/shield-alert';
	import IconWaves from '~icons/lucide/waves';
	import IconActivity from '~icons/lucide/activity';
	import IconCamera from '~icons/lucide/camera';
	import IconThermometer from '~icons/lucide/thermometer';
	import IconGauge from '~icons/lucide/gauge';
	import IconBinoculars from '~icons/lucide/binoculars';
	import IconSkipForward from '~icons/lucide/skip-forward';
	import IconAnchor from '~icons/lucide/anchor';
	import IconMessageSquare from '~icons/lucide/message-square';
	import IconSave from '~icons/lucide/save';
	import IconArrowLeft from '~icons/lucide/arrow-left';
	import IconPlay from '~icons/lucide/play';
	import IconFileText from '~icons/lucide/file-text';
	import IconImages from '~icons/lucide/images';
	import IconVideo from '~icons/lucide/video';
	import IconCircleAlert from '~icons/lucide/circle-alert';
	import IconCircleCheck from '~icons/lucide/circle-check';
	import IconCircleX from '~icons/lucide/circle-x';
	import IconSquareX from '~icons/lucide/square-x';
	import IconList from '~icons/lucide/list';
	import IconTriangleAlert from '~icons/lucide/triangle-alert';
	import IconSquarePen from '~icons/lucide/square-pen';
	import IconPenLine from '~icons/lucide/pen-line';
	import IconPenOff from '~icons/lucide/pen-off';
	import IconChartPie from '~icons/lucide/chart-pie';
	import IconTrendingUp from '~icons/lucide/trending-up';
	import IconUsers from '~icons/lucide/users';
	import IconCircleHelp from '~icons/lucide/circle-help';
	import IconMusic from '~icons/lucide/music';
	import IconArchive from '~icons/lucide/archive';
	import IconFile from '~icons/lucide/file';
	import IconRefreshCw from '~icons/lucide/refresh-cw';
	import IconHome from '~icons/lucide/home';
	import IconFileSearch from '~icons/lucide/file-search';
	import IconLock from '~icons/lucide/lock';
</script>

<!-- Examples of using the icons -->
<div class="p-4 space-y-2">
	<h2 class="text-lg font-semibold">Icon Examples with unplugin-icons</h2>

	<!-- Navigation Icons -->
	<div class="flex gap-2">
		<IconMapPin class="text-primary" />
		<IconCalendar class="text-primary" />
		<IconHome class="text-primary" />
		<IconArrowLeft class="text-primary" />
		<IconChevronDown class="text-primary" />
		<IconChevronRight class="text-primary" />
		<IconList class="text-primary" />
	</div>

	<!-- Weather Icons -->
	<div class="flex gap-2">
		<IconWind class="text-blue-500" />
		<IconCloud class="text-gray-500" />
		<IconThermometer class="text-red-500" />
		<IconWaves class="text-blue-400" />
		<IconGauge class="text-green-500" />
	</div>

	<!-- Action Icons -->
	<div class="flex gap-2">
		<IconSave class="text-green-500" />
		<IconTrash2 class="text-red-500" />
		<IconDownload class="text-blue-500" />
		<IconUpload class="text-purple-500" />
		<IconFilter class="text-orange-500" />
		<IconColumns class="text-indigo-500" />
		<IconRefreshCw class="text-cyan-500" />
	</div>

	<!-- Status Icons -->
	<div class="flex gap-2">
		<IconCheck class="text-green-500" />
		<IconX class="text-red-500" />
		<IconAlertCircle class="text-yellow-500" />
		<IconInfo class="text-blue-500" />
		<IconCircleCheck class="text-green-500" />
		<IconCircleX class="text-red-500" />
		<IconCircleAlert class="text-yellow-500" />
		<IconTriangleAlert class="text-orange-500" />
	</div>

	<!-- Media Icons -->
	<div class="flex gap-2">
		<IconCamera class="text-gray-600" />
		<IconImages class="text-blue-500" />
		<IconVideo class="text-red-500" />
		<IconFileText class="text-gray-500" />
		<IconPlay class="text-green-500" />
		<IconMusic class="text-purple-500" />
		<IconFile class="text-gray-400" />
		<IconFileSearch class="text-blue-400" />
	</div>

	<!-- User/Auth Icons -->
	<div class="flex gap-2">
		<IconUser class="text-gray-600" />
		<IconUsers class="text-blue-500" />
		<IconLogOut class="text-red-500" />
		<IconSettings class="text-gray-500" />
		<IconShieldAlert class="text-yellow-500" />
		<IconLock class="text-gray-600" />
	</div>

	<!-- Other Icons -->
	<div class="flex gap-2">
		<IconEye class="text-blue-500" />
		<IconMail class="text-green-500" />
		<IconGithub class="text-gray-800" />
		<IconLoader2 class="text-gray-500 animate-spin" />
		<IconActivity class="text-purple-500" />
		<IconBinoculars class="text-blue-400" />
		<IconSkipForward class="text-gray-500" />
		<IconAnchor class="text-blue-600" />
		<IconMessageSquare class="text-green-400" />
		<IconSquareX class="text-red-400" />
		<IconSquarePen class="text-blue-400" />
		<IconPenLine class="text-gray-500" />
		<IconPenOff class="text-red-400" />
		<IconChartPie class="text-purple-400" />
		<IconTrendingUp class="text-green-400" />
		<IconCircleHelp class="text-blue-400" />
		<IconArchive class="text-gray-400" />
	</div>

	<!-- Dynamic icon size example -->
	<div class="flex gap-2 items-center">
		<IconSettings width="16" height="16" />
		<IconSettings width="20" height="20" />
		<IconSettings width="24" height="24" />
		<IconSettings width="32" height="32" />
	</div>
</div>