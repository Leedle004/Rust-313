# 示例程序

这些 `.cpp` 与课文对应，可直接编译。语言标准为 C++17。

```bash
g++ -std=c++17 -Wall -Wextra 01-hello.cpp -o hello
./hello
```

| 文件 | 对应课文 |
| --- | --- |
| `01-hello.cpp` | Hello World |
| `01-multiline.cpp` | 多行输出 |
| `02-types.cpp` | 常用类型 |
| `02-cin.cpp` | 键盘输入 |
| `03-operators.cpp` | 运算符 |
| `04-if.cpp` | 条件 |
| `04-loops.cpp` | 循环 |
| `04-switch.cpp` | 菜单式 `switch` |
| `05-functions.cpp` | 函数 |
| `06-array.cpp` | 数组（对照） |
| `06-vector.cpp` | `std::vector` |
| `07-string.cpp` | `std::string` |
| `07-getline.cpp` | 整行读取 |
| `08-reference.cpp` | 引用 |
| `08-pointer.cpp` | 指针 |
| `09-struct.cpp` | 结构体名单 |
| `10-gradebook-starter.cpp` | 成绩册骨架，供第 10 课填写 |

需要输入的程序，在终端运行后按提示打字，或以重定向提供输入：

```bash
printf 'Ada\n18\n' | ./cin_demo
```
