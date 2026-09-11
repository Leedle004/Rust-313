// 练习 2 没有「正确输出」。
// 故意漏分号时，g++ 会给出类似下面的信息（行号随你的文件而变）：
//
//   01-ex2.cpp:6:32: error: expected ';' before 'return'
//
// 看到行号后，把分号加回去即可。下面是改对以后的程序。

#include <iostream>

int main() {
    std::cout << "你好\n";
    std::cout << "我叫 Ada\n";
    std::cout << "我正在学 C++\n";
    return 0;
}
