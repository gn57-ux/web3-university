export interface Comment {
  id: string;
  author: string;
  content: string;
  postedAt: string;
}

export const mockComments: Comment[] = [
  {
    id: "c1",
    author: "0x4A2c...3F92",
    content: "老师讲 memory 和 calldata 的区别讲得很清楚，一下就理解了！",
    postedAt: "2 小时前",
  },
  {
    id: "c2",
    author: "0x9d7b...1a08",
    content: "代码示例很实用，跟着敲了一遍加深了印象。",
    postedAt: "1 天前",
  },
];
