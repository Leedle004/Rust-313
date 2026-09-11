# 第 10 课：小项目——命令行成绩册

你将学会：把前几课拼成一个能用的小程序。按步骤做，每一步都能编译运行。不要一口气写完再第一次编译。

目标：在终端里管理一份学生名单——添加、列出、算平均分、找最高分，然后退出。数据只存在内存里，关掉程序就消失。这正好适合入门；文件读写可以以后再加。

菜单示例：

```text
===== 成绩册 =====
1. 添加学生
2. 列出全部
3. 平均分
4. 最高分
0. 退出
请选择：
```

## 规格（做完时程序应当满足）

1. 启动后反复显示菜单，直到用户选 `0`。
2. 选 `1`：提示输入姓名（不含空格）和整数分数，追加到名单。分数建议限制在 0–100；超出则提示错误，不添加。
3. 选 `2`：按添加顺序打印 `姓名 分数`，每人一行。名单为空时打印 `（空）`。
4. 选 `3`：打印平均分（小数）。名单为空时打印一句提示，不要除以 0。
5. 选 `4`：打印最高分的那条记录。若有并列，打印**先添加的那一条**即可。空名单同样要提示。
6. 其它数字：打印 `无效选项`，然后继续循环。
7. 不要使用 `new` / `delete`，不要 `using namespace std;`。用 `struct`、`std::vector`、函数拆分逻辑。

输入暂时按「用户会按提示输入整数」来写。若 `cin` 失败，可以打印错误并 `return 1`，也可以忽略；参考答案里对菜单选项做了简单失败处理。

## 建议的文件结构

自己新建 `gradebook.cpp`。课文示例骨架在 [`examples/10-gradebook-starter.cpp`](examples/10-gradebook-starter.cpp)，你可以复制过去再填函数。完整参考答案在 [`solutions/10-gradebook.cpp`](solutions/10-gradebook.cpp)。分步对照见 `solutions/10-step1.cpp` 到 `10-step4.cpp`。

编译：

```bash
g++ -std=c++17 -Wall -Wextra gradebook.cpp -o gradebook
./gradebook
```

## 第 1 步：菜单循环

先能转起来。定义：

```cpp
struct Student {
    std::string name;
    int score;
};
```

`main` 里准备 `std::vector<Student> students;`，写 `void print_menu()`，再用：

```cpp
while (true) {
    print_menu();
    int choice = 0;
    if (!(std::cin >> choice)) {
        std::cout << "输入结束\n";
        break;
    }
    if (choice == 0) {
        std::cout << "再见\n";
        break;
    }
    std::cout << "尚未实现。当前人数：" << students.size() << "\n";
}
```

编译运行，输入 `0` 应能退出。对照 [`solutions/10-step1.cpp`](solutions/10-step1.cpp)。

## 第 2 步：添加与列出

写两个函数：

```cpp
void add_student(std::vector<Student>& students);
void list_students(const std::vector<Student>& students);
```

`add_student` 里 `cin >> name >> score`。分数不在 0–100 就打印错误并 `return`，不要 `push_back`。

在 `switch (choice)` 里接上 `case 1` 和 `case 2`。先添加两个学生，再列出，确认顺序对。对照 [`solutions/10-step2.cpp`](solutions/10-step2.cpp)。

## 第 3 步：平均分

```cpp
void print_average(const std::vector<Student>& students);
```

空名单不计算。注意 `int / int`。对照 [`solutions/10-step3.cpp`](solutions/10-step3.cpp)。

## 第 4 步：最高分

```cpp
void print_top(const std::vector<Student>& students);
```

遍历，记下目前最好的 `Student`。空名单提示后返回。对照 [`solutions/10-step4.cpp`](solutions/10-step4.cpp)。

## 第 5 步：收拾一下

- 无效选项走 `default`
- 每个函数只做一件事
- 用 `-Wall -Wextra` 编译，警告清掉
- 自己当用户点一遍：空名单时 2/3/4、错误分数、正常添加、退出

完整程序：[`solutions/10-gradebook.cpp`](solutions/10-gradebook.cpp)。先自己写完再打开。

## 可选加分（做完主规格再考虑）

- 按姓名查找并打印分数
- 删除最后一个学生（`pop_back`）
- 分数改为 `double`
- 把名单保存到文本文件（需要自学 `fstream`，本课不要求）

## 本课要点

- 项目 = 数据（`struct` + `vector`）+ 菜单循环 + 若干小函数
- 每一步都保持可编译
- 空容器、除零、非法分数都要有说法
- 这就是你能继续写「记账本」「待办清单」的同一套骨架

## 练习

本课的练习就是把成绩册做完。

**练习 1.** 完成第 1–2 步（菜单、添加、列出），能跑通。

**练习 2.** 完成第 3–4 步（平均分、最高分）。

**练习 3.** 对照规格自己点一遍，修掉和参考答案不一致的行为（空名单、非法分数、无效菜单）。不必和参考答案逐行相同。

课程到这里告一段落。接下来可以：把成绩册改成记账本；或读一本薄的 C++ 入门书，补上「文件」「更多标准库」；或把练习全部不看答案再默写一遍。
