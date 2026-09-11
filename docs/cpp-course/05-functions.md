# 第 5 课：函数

你将学会：把一段会重复用的逻辑起个名字、传入数据、得到返回值。程序会因此更好读、更好改。

## 1. 为什么要有函数

如果「判断及格」要写三遍，以后规则一改你得改三处。把它变成函数，只维护一处。

函数可以想成：给厨房一个窗口——你递进食材（参数），窗口递出菜（返回值）。

## 2. 最小例子

完整示例：[`examples/05-functions.cpp`](examples/05-functions.cpp)

```cpp
#include <iostream>

int add(int a, int b) {
    return a + b;
}

int main() {
    std::cout << add(2, 3) << "\n";  // 打印 5
    return 0;
}
```

拆开看：

| 部分 | 含义 |
| --- | --- |
| `int add(...)` | 函数名叫 `add`，算完交出一个 `int` |
| `int a, int b` | 两个参数，调用时必须各给一个 `int` |
| `{ return a + b; }` | 函数体；`return` 交出结果并结束函数 |
| `add(2, 3)` | 调用；`2` 传给 `a`，`3` 传给 `b` |

`main` 本身也是函数。程序从 `main` 开始，`main` 再去调用别的函数。

## 3. 先声明，或把函数写在 `main` 前面

C++ 从上往下读。调用时必须已经知道这个函数长什么样。两种做法：

**做法 A：整个函数写在 `main` 上面**（本课例子多用这个）

**做法 B：先写声明，定义放后面**

```cpp
int add(int a, int b);  // 声明：告诉编译器有这么个函数

int main() {
    std::cout << add(2, 3) << "\n";
    return 0;
}

int add(int a, int b) {  // 定义：真正的步骤
    return a + b;
}
```

声明末尾是分号，没有函数体。多文件项目会大量用声明；单文件小程序写在 `main` 前面即可。

## 4. 没有返回值时用 `void`

只做事、不交回一个值：

```cpp
void greet(const std::string& name) {
    std::cout << "你好，" << name << "\n";
}
```

`void` 函数里可以写 `return;` 提前结束，也可以自然走到花括号末尾。`const std::string&` 表示「只读地借用这份字符串」，第 8 课细讲引用。现在你可以先写成 `std::string name`，效果对短字符串一样。

## 5. 参数是副本（默认）

```cpp
void add_one(int n) {
    n += 1;  // 改的是副本
}

int main() {
    int x = 1;
    add_one(x);
    // x 仍然是 1
    return 0;
}
```

除非使用引用（第 8 课），函数里改参数不会改外面的变量。需要交回结果时，用 `return`：

```cpp
int add_one(int n) {
    return n + 1;
}
```

一次要交回两个值时，初学可以返回 `struct`（第 9 课），或用引用参数。不要为了「交回两个 int」去碰指针。

## 6. 小习惯

- 一个函数做一件清楚的事。名字用动词或能读成句子的短语：`is_even`、`celsius_to_fahrenheit`、`print_menu`。
- 参数和返回值的类型写明白，不要为了省事到处 `auto`（`auto` 以后再学也行）。
- 能纯计算的函数就只计算，把 `std::cin` / `std::cout` 留在 `main` 或专门的输入输出函数里。这样更容易测试。

函数可以互相调用。`main` 调 `print_report`，`print_report` 再调 `average`，很常见。

C++ 允许**重载**：同名函数、参数类型或个数不同。例如 `print(int)` 和 `print(double)`。本课知道有这回事即可，不必急着用。

## 7. 本课要点

- 函数 = 名字 + 参数 + 返回类型 + 函数体
- `return` 交结果；不交结果就用 `void`
- 默认传的是副本
- 先保证 `main` 上面能看见函数，或先写声明

## 练习

**练习 1.** 写函数 `int max2(int a, int b)`，返回较大者。在 `main` 里读两个整数，打印这个函数的结果。

**练习 2.** 写 `bool is_even(int n)`，偶数返回 `true`。`main` 里读入一个整数，根据返回值打印 `even` 或 `odd`。

**练习 3.** 写 `double celsius_to_fahrenheit(double c)`，再用它把用户输入的摄氏打印成华氏。公式与第 2 课相同。

做完后打开 [第 6 课](06-vector-array.md)。
