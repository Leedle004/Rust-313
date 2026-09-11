# 第 9 课：`struct` 与简单数据建模

你将学会：把「属于同一件事的几项数据」捆成一种新类型，再用 vector 保存很多条。

## 1. 散落的变量很快会乱

一个学生有姓名和分数。两个变量还勉强：

```cpp
std::string name = "Ada";
int score = 95;
```

十个学生就会变成 `name1, score1, name2, score2, ...`，对不上号。应该说：有一种叫「学生」的东西，它同时拥有姓名和分数。

## 2. 定义 `struct`

```cpp
struct Student {
    std::string name;
    int score;
};
```

这是在造一种新类型，名字叫 `Student`。花括号里是**成员**：每份 `Student` 都有自己的 `name` 和 `score`。

完整示例：[`examples/09-struct.cpp`](examples/09-struct.cpp)

```cpp
Student a;
a.name = "Ada";
a.score = 95;

Student b{"Grace", 88};  // 按成员顺序初始化
```

用 `.` 访问成员：`a.name`、`a.score`。

`struct` 定义通常放在 `main` 上面（和函数一样，先让编译器看见类型）。

## 3. 函数吃进、交出 struct

按值传会复制整份数据。只读时用 `const` 引用；要改时用引用：

```cpp
void print_student(const Student& s) {
    std::cout << s.name << " " << s.score << "\n";
}

void add_bonus(Student& s, int bonus) {
    s.score += bonus;
}
```

返回一份新数据：

```cpp
Student make_student(const std::string& name, int score) {
    return Student{name, score};
}
```

## 4. `vector` 里放 struct

这就是「一张表」：

```cpp
std::vector<Student> class_list;
class_list.push_back(Student{"Ada", 95});
class_list.push_back(Student{"Grace", 88});

for (const Student& s : class_list) {
    print_student(s);
}
```

找最高分：

```cpp
Student best = class_list[0];
for (const Student& s : class_list) {
    if (s.score > best.score) {
        best = s;
    }
}
```

空列表上不要取 `[0]`。先检查 `!class_list.empty()`。

## 5. 建模小建议

- 名字用名词：`Student`、`Item`、`Expense`
- 成员用小写加下划线：`unit_price`、`birth_year`
- 一开始不要塞太多成员。姓名 + 分数就够成绩册；日期 + 金额 + 类别才组成一笔记账
- 暂时不必写「成员函数 / 类 / 访问权限」。`struct` 加公开成员，对入门项目完全够用

一个 struct 里还可以再包含别的 struct，本课不展开。先把「一条记录」做稳。

## 6. 本课要点

- `struct` 把相关字段捆成一种类型
- `.` 访问成员；初始化可用 `Student{"Ada", 95}`
- `std::vector<Student>` 保存很多条
- 函数用 `const T&` 只读，`T&` 可改

## 练习

**练习 1.** 定义 `struct Point { int x; int y; };`，读入两个点，打印它们的曼哈顿距离 `|x1-x2| + |y1-y2|`。绝对值可用自己写的 `int abs_int(int n)`（负数就返回 `-n`），或 `#include <cstdlib>` 里的 `std::abs`。

**练习 2.** 定义 `struct Book { std::string title; int year; };`，在 `main` 里放进至少两本书，打印每本书的标题和年份。

**练习 3.** 读入整数 `n`，再读 n 行「姓名 分数」（姓名不含空格），存进 `std::vector<Student>`，打印平均分（小数）。`n >= 1`。

做完后打开 [第 10 课](10-capstone.md)，把这些拼成一个小项目。
