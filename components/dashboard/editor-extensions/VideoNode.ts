import { Node, mergeAttributes } from '@tiptap/core';
export interface VideoOptions {
  HTMLAttributes: Record<string, any>;
}
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: {
        src: string;
      }) => ReturnType;
    };
  }
}
export const VideoNode = Node.create<VideoOptions>({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,
  addOptions() {
    return {
      HTMLAttributes: {
        class: 'rounded-lg max-w-full',
        controls: 'true'
      }
    };
  },
  addAttributes() {
    return {
      src: {
        default: null
      }
    };
  },
  parseHTML() {
    return [{
      tag: 'video',
      getAttrs: el => ({
        src: (el as HTMLElement).getAttribute('src') || (el as HTMLElement).querySelector('source')?.getAttribute('src') || null
      })
    }];
  },
  renderHTML({
    HTMLAttributes
  }) {
    return ['video', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      controls: 'true',
      preload: 'metadata'
    })];
  },
  addCommands() {
    return {
      setVideo: options => ({
        commands
      }) => commands.insertContent({
        type: this.name,
        attrs: options
      })
    };
  }
});
export default VideoNode;
