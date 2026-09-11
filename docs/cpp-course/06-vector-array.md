# 第 6 课：`std::vector` 与数组

你将学会：保存「一串个数会变的值」。日常列表请用 `std::vector`；数组只作对照，知道它存在即可。

## 1. 为什么需要容器

三个分数还能写成 `s1, s2, s3`。三十个分数就不能靠变量名硬撑。容器按顺序放很多同类型的值，还能问「现在有几个」。

## 2. 固定长度：数组（简要）

```cpp
int scores[3] = {90, 80, 70};
std::cout << scores[0] << "\n";  // 90，下标从 0 开始
```

- 长度必须在编译时就知道（本课这个写法）
- 不能方便地追加第 4 个
- 写成 `scores[3]` 是越界，属于未定义行为：可能崩溃，也可能悄悄错下去

完整示例：[`examples/06-array.cpp`](examples/06-array.cpp)

数组在现代 C++ 里仍会出现（尤其和旧接口打交道），但**新代码存一列数请用 `std::vector`**。

## 3. `std::vector`：可以变长的列表

需要 `#include <vector>`。完整示例：[`examples/06-vector.cpp`](examples/06-vector.cpp)

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> scores;
    scores.push_back(90);
    scores.push_back(80);
    scores.push_back(70);

    std::cout << "个数：" << scores.size() << "\n";
    std::cout << "第一个：" << scores[0] << "\n";
    return 0;
}
```

`std::vector<int>` 读作「一串 int」。尖括号里换成 `double`、`std::string` 也可以。

常用操作：

| 代码 | 作用 |
| --- | --- |
| `v.push_back(x)` | 在末尾追加 |
| `v.size()` | 当前个数（类型是 `std::size_t`，可当成非负整数用） |
| `v[i]` | 下标 `i` 的元素，从 0 开始 |
| `v.at(i)` | 带检查的下标；越界会抛异常，比 `[]` 安全 |
| `v.empty()` | 是否一个都没有 |
| `v.back()` | 最后一个元素（空 vector 上不要调用） |

创建时直接给值：

```cpp
std::vector<int> scores = {90, 80, 70};
```

## 4. 遍历

下标：

```cpp
for (std::size_t i = 0; i < scores.size(); ++i) {
    std::cout << scores[i] << "\n";
}
```

范围 for（更不容易写错边界，能读就优先用）：

```cpp
for (int s : scores) {
    std::cout << s << "\n";
}
```

`for (int s : scores)` 里的 `s` 是副本。若要改原 vector 里的值，写成引用（第 8 课）：`for (int& s : scores)`。只读大对象时用 `const auto&`。现在对 `int` 用副本完全没问题。

求和：

```cpp
int sum = 0;
for (int s : scores) {
    sum += s;
}
```

## 5. 从输入装进 vector

「先读个数，再读那么多个数」：

```cpp
int n = 0;
std::cin >> n;
std::vector<int> a;
for (int i = 0; i < n; ++i) {
    int x = 0;
    std::cin >> x;
    a.push_back(x);
}
```

也可以 `std::vector<int> a(n, 0);` 先造出 n 个 0，再往 `a[i]` 里读。两种都常见。

## 6. 越界

`scores` 有 3 个元素时，合法下标是 `0, 1, 2`。`scores[3]` 或 `scores[-1]` 都是错误。`size()` 是 3 不代表可以用下标 3。

循环写成 `i < scores.size()`，不要写成 `i <= scores.size()`。

## 7. 本课要点

- 一列会变长的数据：`std::vector<T>`
- 下标从 0 开始；用 `size()` 和范围 for
- 不要越界；新代码不要为了「简单」去用手动 `new int[n]`
- 数组知道即可，练习用 vector 做

## 练习

**练习 1.** 读入整数 `n`，再读 `n` 个整数，打印它们的和。

**练习 2.** 读入 `n` 和 n 个整数，打印最大值。保证 `n >= 1`。

**练习 3.** 读入 `n` 和 n 个整数，然后读一个 `target`，打印有多少个元素等于 `target`。

做完后打开 [第 7 课](07-string.md)。
