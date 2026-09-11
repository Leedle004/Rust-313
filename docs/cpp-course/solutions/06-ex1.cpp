#include <iostream>
#include <vector>

int main() {
    int n = 0;
    std::cout << "请输入个数：";
    std::cin >> n;

    std::vector<int> a;
    for (int i = 0; i < n; ++i) {
        int x = 0;
        std::cin >> x;
        a.push_back(x);
    }

    int sum = 0;
    for (int x : a) {
        sum += x;
    }
    std::cout << sum << "\n";
    return 0;
}
