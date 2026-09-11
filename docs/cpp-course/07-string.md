# 第 7 课：`std::string`

你将学会：处理一串文字，区分 `cin` 和整行读取，做长度、查找、拼接这些日常操作。

## 1. 字符串是字符的序列

`std::string` 需要 `#include <string>`。它能变长，用法上很像「专门存字符的 vector」，但为文本准备了更多函数。

```cpp
std::string name = "Ada";
name += " Lovelace";
std::cout << name << "\n";       // Ada Lovelace
std::cout << name.size() << "\n";
```

完整示例：[`examples/07-string.cpp`](examples/07-string.cpp)

双引号 `"Ada"` 的类型其实是 C 风格字符串（后面藏着 `'\0'`）。赋给 `std::string` 时会复制成 C++ 字符串。本课一律用 `std::string` 保存和修改文本，不要自己去碰那种原始指针。

## 2. `cin >>` 遇到空格就停

```cpp
std::string name;
std::cin >> name;  // 输入 Ada Lovelace → name 只有 Ada
```

读「一个词」时这样很好。读整句、整行要用 `std::getline`。完整示例：[`examples/07-getline.cpp`](examples/07-getline.cpp)

```cpp
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::cout << "请输入一整行：";
    std::getline(std::cin, line);
    std::cout << "你输入了：" << line << "\n";
    return 0;
}
```

## 3. `cin` 和 `getline` 混用

这是第二个经典坑。`std::cin >> x` 读完数字后，行末的**换行符还留在缓冲区**。紧接着的 `getline` 会立刻读到一个空行。

处理办法：在 `getline` 之前丢掉这一行剩余内容：

```cpp
int age = 0;
std::cin >> age;
std::cin.ignore(10000, '\n');  // 丢掉本行剩下的，最多 10000 个字符，直到换行

std::string extra;
std::getline(std::cin, extra);
```

更稳妥可用 `#include <limits>` 后：

```cpp
std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
```

本课记住口令即可：**先 `>>` 再 `getline`，中间要 `ignore`。**

## 4. 常用操作

```cpp
std::string s = "hello";

s.size();                 // 5
s.empty();                // false
s[0];                     // 'h'，同样不要越界
s.substr(1, 3);           // 从下标 1 起取 3 个字符："ell"
s.find("ll");             // 找到则返回起始下标；找不到返回 std::string::npos
s += "!";                 // 拼接
```

判断是否包含某段文字：

```cpp
if (s.find("ell") != std::string::npos) {
    std::cout << "找到了\n";
}
```

比较：

```cpp
if (s == "hello") { /* ... */ }
```

遍历每个字符：

```cpp
for (char c : s) {
    std::cout << c << "\n";
}
```

`char` 比较时区分大小写：`'A'` 和 `'a'` 不同。需要忽略大小写时，先把字符统一转换（练习里若需要会说明）。

## 5. 字面量与转义

`\n` 换行，`\t` 制表，`\\` 一个反斜杠，`\"` 在字符串里放双引号：

```cpp
std::cout << "她说：\"你好\"\n";
```

原始字符串（C++11 起）适合多行或很多反斜杠，本课不强制用：

```cpp
std::string path = R"(C:\Users\Ada)";
```

## 6. 本课要点

- 文本用 `std::string`，记得 `#include <string>`
- 一个词：`cin >>`；一整行：`getline`
- 两者连用要清掉行尾换行
- `size` / `+` / `find` / `substr` 够用很长时间

## 练习

**练习 1.** 读入一行文字（可能含空格），打印它的长度（字符数，`size()`）。

**练习 2.** 读入一个不含空格的词，判断它是不是回文（正着反着一样，如 `level`）。是则打印 `yes`，否则 `no`。只考虑英文字母小写即可。

**练习 3.** 读入一行，统计其中有多少个空格，打印这个数字。

做完后打开 [第 8 课](08-references-pointers.md)。
