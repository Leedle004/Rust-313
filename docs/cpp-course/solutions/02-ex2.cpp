#include <iostream>

int main() {
    double celsius = 0.0;

    std::cout << "请输入摄氏温度：";
    std::cin >> celsius;

    const double fahrenheit = celsius * 9.0 / 5.0 + 32.0;
    std::cout << "华氏温度为 " << fahrenheit << "\n";
    return 0;
}
