<script lang="ts">
import JitsiMeetJS from "lib-jitsi-meet/dist/esm/JitsiMeetJS"

JitsiMeetJS.init()

const connection = new JitsiMeetJS.JitsiConnection("codelabs", null, {})
</script>
