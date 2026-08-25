import { Extension } from '@tiptap/core';
const STEP = 24;
const MAX_INDENT = 8 * STEP;
export interface IndentOptions {
  types: string[];
}
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}
export const IndentExtension = Extension.create<IndentOptions>({
  name: 'indent',
  addOptions() {
    return {
      types: ['paragraph', 'heading']
    };
  },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        indent: {
          default: 0,
          parseHTML: element => {
            const margin = parseInt(element.style.marginLeft || '0', 10);
            return Number.isNaN(margin) ? 0 : margin;
          },
          renderHTML: attributes => {
            if (!attributes.indent) return {};
            return {
              style: `margin-left: ${attributes.indent}px`
            };
          }
        }
      }
    }];
  },
  addCommands() {
    return {
      indent: () => ({
        tr,
        state,
        dispatch
      }) => {
        const {
          selection
        } = state;
        if (dispatch) {
          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const current = node.attrs.indent || 0;
              tr.setNodeAttribute(pos, 'indent', Math.min(current + STEP, MAX_INDENT));
            }
          });
          dispatch(tr);
        }
        return true;
      },
      outdent: () => ({
        tr,
        state,
        dispatch
      }) => {
        const {
          selection
        } = state;
        if (dispatch) {
          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const current = node.attrs.indent || 0;
              tr.setNodeAttribute(pos, 'indent', Math.max(current - STEP, 0));
            }
          });
          dispatch(tr);
        }
        return true;
      }
    };
  }
});
export default IndentExtension;
