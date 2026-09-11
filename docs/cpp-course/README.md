# C++ 入门课

这套课给完全没写过 C++ 的人。你如果已经在聊天里看过「C++ 是什么、Hello World、怎么用 `g++` 编译」，可以把那条消息当成热身；正式学习从这里的第 1 课开始。课文写成了可以反复打开的文件，例子都能编译运行。

## 适合谁

- 零基础，或只写过一点点别的语言
- 想按顺序学，而不是东搜一句西搜一句
- 愿意自己敲代码、看报错、改到能跑

不需要先学 C。本课用的是现代 C++（C++17）：输入输出用 `std::cin` / `std::cout`，文本用 `std::string`，列表用 `std::vector`。早期课程不用 `NULL`、不用手动 `new` / `delete`，头文件里也不写 `using namespace std;`。

## 怎么学

1. **按编号读课文**。每一课都自成一篇，不依赖聊天记录。
2. **自己敲例子**。复制能跑，但敲一遍才会记住。
3. **先做练习，再看答案**。参考答案在 [`solutions/`](solutions/)，课文里只给题目。
4. **卡住了怎么办**：先读编译器报错；再对照例子；仍不会就打开对应的 `solutions/` 文件，看懂后合上，自己再写一遍。
5. **每课结束时**，确认：例子能编译、练习你做过、报错过你见过。

每天 40–90 分钟比较合适。不要一次连刷很多课。

## 准备编译器

C++ 源文件是文本（通常叫 `something.cpp`）。编译器把它变成可以运行的程序。本课例子按 **C++17** 编写。

通用编译命令（把文件名换成你的）：

```bash
g++ -std=c++17 -Wall -Wextra hello.cpp -o hello
```

`-std=c++17` 指定语言版本，`-Wall -Wextra` 打开常用警告。养成带警告编译的习惯。

### Linux

多数发行版可以这样装 g++：

```bash
# Debian / Ubuntu
sudo apt update
sudo apt install build-essential

# Fedora
sudo dnf install gcc-c++
```

验证：

```bash
g++ --version
```

也可以装 clang：

```bash
sudo apt install clang
clang++ -std=c++17 -Wall -Wextra hello.cpp -o hello
```

### macOS

1. 打开「终端」，运行 `xcode-select --install`，按提示装命令行工具。
2. 之后可以用 `clang++`（苹果默认）或自己用 Homebrew 装 `gcc`。

```bash
clang++ -std=c++17 -Wall -Wextra hello.cpp -o hello
```

### Windows

任选一条路，不要混着用三套工具还搞不清自己在用哪套。

**方式 A：MinGW-w64 / MSYS2（命令接近 Linux）**

1. 安装 [MSYS2](https://www.msys2.org/)。
2. 打开 MSYS2 UCRT64 终端，执行：

```bash
pacman -S mingw-w64-ucrt-x86_64-gcc
```

3. 把 MSYS2 的 `ucrt64\bin` 加到系统 PATH。之后在 PowerShell 或 CMD 里：

```text
g++ -std=c++17 -Wall -Wextra hello.cpp -o hello.exe
hello.exe
```

**方式 B：Visual Studio（MSVC）**

1. 安装 [Visual Studio](https://visualstudio.microsoft.com/)，工作负载勾选「使用 C++ 的桌面开发」。
2. 打开「x64 Native Tools Command Prompt for VS」。
3. 编译：

```text
cl /std:c++17 /W4 /EHsc hello.cpp
hello.exe
```

MSVC 的可执行文件默认叫 `hello.exe`。课文例子按 `g++` 来写；你用 MSVC 时，把命令换成上面这一行即可，源文件不用改。

**方式 C：只想快点开始**

[VS Code](https://code.visualstudio.com/) 加 C++ 扩展，或 [CLion](https://www.jetbrains.com/clion/) 都可以。编辑器不能代替编译器：仍然需要上面某一种编译器装好。

### 运行

Linux / macOS：

```bash
./hello
```

Windows：

```text
hello.exe
```

`./` 表示「当前目录里的这个程序」。漏掉它，系统可能去别的地方找同名命令。

## 课程顺序

| 课 | 文件 | 内容 |
| --- | --- | --- |
| 1 | [01-environment.md](01-environment.md) | 环境、Hello World、编译与运行 |
| 2 | [02-variables.md](02-variables.md) | 变量、类型、初始化、`cin` |
| 3 | [03-operators.md](03-operators.md) | 运算符与表达式 |
| 4 | [04-control-flow.md](04-control-flow.md) | `if`、循环、`switch` |
| 5 | [05-functions.md](05-functions.md) | 函数 |
| 6 | [06-vector-array.md](06-vector-array.md) | `std::vector` 与数组 |
| 7 | [07-string.md](07-string.md) | `std::string` |
| 8 | [08-references-pointers.md](08-references-pointers.md) | 引用，以及指针的谨慎入门 |
| 9 | [09-struct.md](09-struct.md) | `struct` 与简单数据建模 |
| 10 | [10-capstone.md](10-capstone.md) | 小项目：命令行成绩册 |

配套源码：

- [`examples/`](examples/)：课文里的完整示例，可直接编译。
- [`solutions/`](solutions/)：练习参考答案。先自己做。

编译某个例子：

```bash
g++ -std=c++17 -Wall -Wextra examples/01-hello.cpp -o hello
./hello
```

## 练习怎么用

每课文末有若干练习。规则：

- **先写、再编译、再运行**。运行结果不对就改，不要先翻答案。
- 参考答案是「一种写得对的办法」，不是唯一写法。
- 答案文件名和题目编号对应，例如第 2 课第 1 题是 `solutions/02-ex1.cpp`。
- 第 10 课按步骤做；每一步都可以对照 `solutions/` 里对应阶段的程序。

## 本课的代码习惯

- 用 `std::cout`、`std::string` 这种完整名字，暂时不在文件开头写 `using namespace std;`。
- 整数、小数、文本的输入输出都走标准库，不使用过时的 C 语言写法（早期课不讲 `printf`）。
- 空指针写 `nullptr`，不写 `NULL`。
- 前几课不讲手动申请内存。需要「一串东西」时用 `std::vector` 或 `std::string`。

准备好编译器之后，打开 [第 1 课](01-environment.md)。
