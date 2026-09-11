#include <iostream>
#include <vector>

int main() {
    int n = 0;
    std::cin >> n;

    std::vector<int> a;
    for (int i = 0; i < n; ++i) {
        int x = 0;
        std::cin >> x;
        a.push_back(x);
    }

    int best = a[0];
    for (int x : a) {
        if (x > best) {
            best = x;
        }
    }
    std::cout << best << "\n";
    return 0;
}
