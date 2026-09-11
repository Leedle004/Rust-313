#include <iostream>

int main() {
    int a = 0;
    int b = 0;
    int c = 0;
    std::cout << "请输入三个整数：";
    std::cin >> a >> b >> c;

    const double mean = (a + b + c) / 3.0;
    std::cout << "平均值是 " << mean << "\n";
    return 0;
}
