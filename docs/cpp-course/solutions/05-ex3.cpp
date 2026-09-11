#include <iostream>

double celsius_to_fahrenheit(double c) {
    return c * 9.0 / 5.0 + 32.0;
}

int main() {
    double celsius = 0.0;
    std::cout << "请输入摄氏温度：";
    std::cin >> celsius;
    std::cout << "华氏温度为 " << celsius_to_fahrenheit(celsius) << "\n";
    return 0;
}
