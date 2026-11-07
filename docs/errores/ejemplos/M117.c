#include <stdio.h>
int f(int x) { return x; }
int f(int y) { return y + 1; }
int main() {
    printf("%d\n", f(2));
    return 0;
}
