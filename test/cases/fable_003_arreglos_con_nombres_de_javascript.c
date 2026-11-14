#include <stdio.h>
int main() {
    int constructor[3] = {1, 2, 3};
    char toString[10] = "hola";
    int __proto__[2][2] = {{1, 2}, {3, 4}};
    static int valueOf = 5;
    printf("%d %s %d %d\n", constructor[1], toString, __proto__[1][1], valueOf);
    switch (constructor[0]) { case 1: printf("uno\n"); break; default: printf("otro\n"); }
    return 0;
}
