#include <iostream>

struct Point {
    int x;
    int y;
};

int abs_int(int n) {
    if (n < 0) {
        return -n;
    }
    return n;
}

int manhattan(const Point& a, const Point& b) {
    return abs_int(a.x - b.x) + abs_int(a.y - b.y);
}

int main() {
    Point a{0, 0};
    Point b{0, 0};
    std::cout << "请输入第一个点的 x y：";
    std::cin >> a.x >> a.y;
    std::cout << "请输入第二个点的 x y：";
    std::cin >> b.x >> b.y;
    std::cout << manhattan(a, b) << "\n";
    return 0;
}
