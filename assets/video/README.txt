Thumbnail video loops go in this folder.

1. Export each loop as an H.264 .mp4, muted, about 6 to 10 seconds, 1920 px wide or smaller, ideally under 3 MB.
2. Name it after the project, for example relay.mp4.
3. In index.html, find that project's tile and fill in its data-video attribute:
     <div class="tile-media" data-video="assets/video/relay.mp4">
   The still image stays as the poster and fallback. The clip only downloads and plays while the tile is on screen,
   and it is skipped for visitors who have reduced motion or data saving turned on.
