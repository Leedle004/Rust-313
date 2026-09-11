# 第 4 课：控制流（`if`、循环、`switch`）

你将学会：按条件走不同分支、重复做一件事、用 `switch` 处理「多个固定选项」。

到目前为止，程序从上到下各执行一次。有了控制流，它才能做判断和重复。

## 1. `if` / `else`

```cpp
if (条件) {
    // 条件为真时执行
} else {
    // 条件为假时执行
}
```

条件是能变成 `bool` 的表达式。完整示例：[`examples/04-if.cpp`](examples/04-if.cpp)

```cpp
#include <iostream>

int main() {
    int score = 0;
    std::cout << "请输入分数：";
    std::cin >> score;

    if (score >= 60) {
        std::cout << "及格\n";
    } else {
        std::cout << "不及格\n";
    }
    return 0;
}
```

多个档位用 `else if` 接下去，**从上到下**匹配到第一个真就停：

```cpp
if (score >= 90) {
    std::cout << "优\n";
} else if (score >= 60) {
    std::cout << "及格\n";
} else {
    std::cout << "不及格\n";
}
```

花括号即使里面只有一行也建议保留，避免以后加行时改错范围。

不要在条件里写 `if (score = 60)`。那是赋值。比较用 `>=`、`==` 等。

## 2. `while`：条件成立就继续

```cpp
int n = 1;
while (n <= 3) {
    std::cout << n << "\n";
    n += 1;
}
```

会打印 `1` `2` `3`。每次循环先检查 `n <= 3`。

若忘记 `n += 1`，条件永远真，程序停不下来，这叫死循环。终端里可用 Ctrl+C 中断。

适合「不知道要转几圈、靠条件结束」的情况，例如一直读入直到用户输入 `0`。

## 3. `for`：次数明确时更好读

```cpp
for (int i = 1; i <= 3; ++i) {
    std::cout << i << "\n";
}
```

括号里三段，用分号隔开：

1. 开始时做一次：`int i = 1`
2. 每次进入循环体前检查：`i <= 3`
3. 每次循环体结束后做：`++i`

`i` 只在这个 `for` 里存在（作用域）。完整循环示例：[`examples/04-loops.cpp`](examples/04-loops.cpp)

数数、遍历下标，优先 `for`。一直等到某件事发生，优先 `while`。

## 4. `break` 和 `continue`

- `break`：立刻离开当前这层循环
- `continue`：跳过本圈剩下的语句，进入下一圈

```cpp
for (int i = 1; i <= 5; ++i) {
    if (i == 3) {
        continue;  // 不打印 3
    }
    std::cout << i << "\n";
}
```

初学少用、用清楚。能把条件写明白时，不必堆很多 `continue`。

## 5. `switch`：按整数值选分支

适合「一个整数对应几个固定选项」，例如菜单。完整示例：[`examples/04-switch.cpp`](examples/04-switch.cpp)

```cpp
#include <iostream>

int main() {
    int choice = 0;
    std::cout << "1 加法  2 减法  0 退出\n请选择：";
    std::cin >> choice;

    switch (choice) {
        case 1:
            std::cout << "你选了加法\n";
            break;
        case 2:
            std::cout << "你选了减法\n";
            break;
        case 0:
            std::cout << "再见\n";
            break;
        default:
            std::cout << "无效选项\n";
            break;
    }
    return 0;
}
```

要点：

- `case` 后面必须是整型常量（`int`、`char` 等），不能是 `double`，也不能是 `std::string`（字符串用 `if`）。
- 每个分支末尾写 `break`。漏了会「掉进」下一个 `case` 继续执行，这叫 fall-through，初学把它当成错误。
- `default` 处理所有没列出来的值。

菜单程序常常是 `while (true)` 包着 `switch`，选 0 时 `break` 跳出循环。第 10 课的成绩册就是这种结构。

## 6. 嵌套：分支里还可以再分支

```cpp
if (age >= 18) {
    if (has_ticket) {
        std::cout << "可以入场\n";
    } else {
        std::cout << "请先买票\n";
    }
} else {
    std::cout << "年龄不足\n";
}
```

层数不要太多。两三个条件常常能写成一个 `&&`。

## 7. 本课要点

- `if` / `else if` / `else` 做判断
- `while` 按条件重复，`for` 按计数重复
- `switch` + `break` 做菜单；字符串不要用 `switch`
- Ctrl+C 可打断死循环

## 练习

**练习 1.** 读入一个分数（0–100 的整数）。90 以上打印 `A`，80–89 打印 `B`，60–79 打印 `C`，否则打印 `D`。范围之外打印 `invalid`。

**练习 2.** 用 `for` 打印 1 到 20 之间所有 3 的倍数，每个数字一行。

**练习 3.** 做一个猜数字小游戏：程序里写死秘密数字 `7`（以后你会学随机数，现在不必）。用户反复猜，猜大了印 `too big`，猜小了印 `too small`，猜中印 `correct` 并结束。用 `while`。

做完后打开 [第 5 课](05-functions.md)。
